/* eslint-disable spaced-comment */

/**************
 * Constants
 *************/

import fs from 'fs';
import crypto from 'crypto';
import { promisify } from 'util';
import archiver from 'archiver';
import log from './logger';
import DecryptionWrongPasswordError from './error-types/DecryptionWrongPasswordError';
import EncryptedFileMissingMetadataError from './error-types/EncryptedFileMissingMetadataError';
import FileReadError from './error-types/FileReadError';
import FileWriteError from './error-types/FileWriteError';
import prettyPrintFilePath, {
  generateValidDecryptedFilePath,
  generateValidEncryptedFilePath,
  generateValidZipFilePath,
  isDeadboltEncryptedFile,
} from './fileUtils';
import EncryptionOrDecryptionEnum from './EncryptionOrDecryptionEnum';

const AES_256_GCM = 'aes-256-gcm';

// Version constants for binary format
const VERSION_HEADER_PREFIX = 'DEADBOLT_V';
const CURRENT_VERSION = '002';
const VERSION_HEADER = `${VERSION_HEADER_PREFIX}${CURRENT_VERSION}`; // "DEADBOLT_V002"
const VERSION_HEADER_LEN = VERSION_HEADER.length; // 13 bytes

// Version to iterations mapping
// V001 is the legacy format (no version header in file)
// V002 adds version header and increases iterations to 1,000,000
const VERSION_ITERATIONS_MAP: Record<string, number> = {
  '001': 10000, // Legacy format
  '002': 1000000, // Current format - exceeds OWASP recommendations for maximum security
};

// Metadata lengths
const LEGACY_METADATA_LEN = 96; // V001: salt(64) + IV(16) + authTag(16)
const METADATA_LEN = LEGACY_METADATA_LEN + VERSION_HEADER_LEN; // V002: version(13) + salt(64) + IV(16) + authTag(16) = 109

/*************
 * Error Prefix
 ************/

// Electron doesn't let you pass custom error messages from IPCMain to the renderer process
// https://github.com/electron/electron/issues/24427
// There are some workarounds floating around, like https://m-t-a.medium.com/electron-getting-custom-error-messages-from-ipc-main-617916e85151
// but we're going to galaxy brain it and just return a string to the renderer process with a prefix to indicate that it's an error.
// ....
export const ERROR_MESSAGE_PREFIX = 'ERROR_FROM_ELECTRON_MAIN_THREAD';

function convertErrorToStringForRendererProcess(
  error: Error,
  filePath: string,
): string {
  // Does this look super fucked? Yeah. But it does work.
  const prettyFilePath = prettyPrintFilePath(filePath);
  switch (true) {
    case error instanceof DecryptionWrongPasswordError:
      return `${ERROR_MESSAGE_PREFIX}: Failed to decrypt \`${prettyFilePath}\`\nIs the password correct?`;

    case error instanceof EncryptedFileMissingMetadataError:
      return `${ERROR_MESSAGE_PREFIX}: \`${prettyFilePath}\` is missing metadata.\nIt's likely corrupted.`;

    case error instanceof FileReadError:
      return `${ERROR_MESSAGE_PREFIX}: Failed to retrieve file contents of \`${prettyFilePath}\` for ${(error as FileReadError).operation}.`;

    case error instanceof FileWriteError:
      return `${ERROR_MESSAGE_PREFIX}: \`${prettyFilePath}\` failed to be written during \`${(error as FileWriteError).operation}\`.`;

    default:
      return `${ERROR_MESSAGE_PREFIX}: Unhandled error!!! Please report this to https://github.com/alichtman/deadbolt/issues/new with as much detail about what you were doing as possible. \`${error}\``;
  }
}

/**
 * These two functions are used to read and write files, and give me an awaitable API.
 * This allows me to bubble up errors to the renderer process (in string format)
 *
 * cc @michaelneu thanks for the advice
 */
function writeFileWithPromise(path: string, data: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(path, { flags: 'w+' });
    stream.on('error', reject);
    stream.write(data, (err) => {
      if (err) {
        reject(err); // Reject with the actual error object instead of a string
      } else {
        resolve(path);
      }
    });
  });
}

function readFileWithPromise(path: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        reject(err); // Reject with the actual error object instead of a string
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * This is not used for any cryptographic purpose, just to validate data integrity after encryption
 * @param data
 * @returns SHA256 hash of data as a hex string
 */
function sha256Hash(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/*********************************
 * AES-256 Encryption + Decryption
 *********************************/

/**
 * Returns a SHA512 digest to be used as the key for AES encryption. Uses a 64B salt with PBKDF2.
 * Iteration count depends on the file format version.
 * @param  {Buffer} salt          64 byte random salt
 * @param  {string} encryptionKey User's entered encryption key
 * @param  {number} iterations    Number of PBKDF2 iterations (default: 1000000 for V002)
 * @return {Buffer}               SHA512 hash that will be used as the encryption key.
 */
function createDerivedKey(
  salt: crypto.BinaryLike,
  encryptionKey: crypto.BinaryLike,
  iterations: number = VERSION_ITERATIONS_MAP[CURRENT_VERSION],
): Buffer {
  return crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    iterations,
    32, // This value is in bytes
    'sha512',
  );
}

/**
 * Detects the version of an encrypted file and returns the appropriate iteration count.
 * @param encryptedFilePath Path to the encrypted file
 * @returns Object containing version, iterations, and whether it's a legacy file
 */
function detectFileVersion(
  encryptedFilePath: string,
): { version: string; iterations: number; isLegacy: boolean } {
  const fd = fs.openSync(encryptedFilePath, 'r');
  const versionBuffer = Buffer.alloc(VERSION_HEADER_LEN);
  fs.readSync(fd, versionBuffer, 0, VERSION_HEADER_LEN, 0);
  fs.closeSync(fd);

  const versionString = versionBuffer.toString('ascii');

  // Check if file starts with "DEADBOLT_V"
  if (versionString.startsWith(VERSION_HEADER_PREFIX)) {
    // Extract version number (last 3 digits)
    const version = versionString.substring(VERSION_HEADER_PREFIX.length);
    const iterations = VERSION_ITERATIONS_MAP[version];

    if (!iterations) {
      throw new Error(`Unknown file version: ${version}`);
    }

    return { version, iterations, isLegacy: false };
  }

  // Legacy format (no version header)
  return { version: '001', iterations: VERSION_ITERATIONS_MAP['001'], isLegacy: true };
}

/**
 * Decrypts the contents of an encrypted file, and returns it as a buffer. This is so we can re-use this in the actual decryption function,
 * as well as the encryption function (to take a SHA256 hash of the data after encrypting AND THEN decrypting it. I feel like the auth tag SHOULD do this, so maybe it's unnecessary)
 * @param encryptedFilePath
 * @param decryptionKey
 * @returns Buffer if successful, error throw if failure
 */
async function getDecryptedFileContents(
  encryptedFilePath: string,
  decryptionKey: crypto.BinaryLike,
  isVerification: boolean = false,
): Promise<Buffer> {
  // Detect file version and get appropriate iteration count
  const { iterations, isLegacy } = detectFileVersion(encryptedFilePath);

  // Calculate offsets based on whether this is a legacy file
  const saltOffset = isLegacy ? 0 : VERSION_HEADER_LEN;
  const ivOffset = saltOffset + 64;
  const authTagOffset = ivOffset + 16;
  const metadataLength = isLegacy ? LEGACY_METADATA_LEN : METADATA_LEN;

  // Read salt, IV and authTag from file
  const fd = fs.openSync(encryptedFilePath, 'r');
  const salt = Buffer.alloc(64);
  fs.readSync(fd, salt, 0, 64, saltOffset);

  const initializationVector = Buffer.alloc(16);
  fs.readSync(fd, initializationVector, 0, 16, ivOffset);

  const authTag = Buffer.alloc(16);
  fs.readSync(fd, authTag, 0, 16, authTagOffset);
  fs.closeSync(fd);

  // Decrypt the cipher text using the appropriate iteration count
  const derivedKey = createDerivedKey(salt, decryptionKey, iterations);
  const decrypt = crypto.createDecipheriv(
    AES_256_GCM,
    derivedKey,
    initializationVector,
  );

  // Detect decryption/corruption errors. This will throw when we call decrypt.final() if data has been corrupted / tampered with
  decrypt.setAuthTag(authTag);

  // Read encrypted file, and drop the metadata bytes
  const cipherText = await readFileWithPromise(encryptedFilePath)
    .then((data) => {
      // For legacy files, check against LEGACY_METADATA_LEN
      const minMetadataLen = isLegacy ? LEGACY_METADATA_LEN : METADATA_LEN;
      if (data.length < minMetadataLen && data.length > 0) {
        throw new EncryptedFileMissingMetadataError();
      } else if (data.length === 0) {
        throw new FileReadError(
          isVerification
            ? EncryptionOrDecryptionEnum.DECRYPTION_VERIFICATION_OF_ENCRYPTION
            : EncryptionOrDecryptionEnum.DECRYPTION,
        );
      }
      return data.subarray(metadataLength);
    })
    .catch((error: Error) => {
      // Unclear if we need to catch and rethrow, or if the exception would bubble up. Leaving in for now
      throw error;
    });

  try {
    const decryptedText = decrypt.update(cipherText);
    decrypt.final();
    return decryptedText;
  } catch (error) {
    throw new DecryptionWrongPasswordError();
  }
}

/**
 * Creates a zip archive of a directory
 * @param sourcePath Directory to zip
 * @param outputPath Path for the output zip file
 * @returns Promise that resolves when zipping is complete
 */
function zipDirectory(sourcePath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    output.on('close', () => {
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourcePath, false);
    archive.finalize();
  });
}

/**
 * Encrypts a file using this format (V002):
 * +------------------+--------------------+-----------------------+----------------+----------------+
 * | Version Header   | Salt               | Initialization Vector | Auth Tag       | Payload        |
 * | File version     | Used to derive key | AES GCM XOR Init      | Data Integrity | Encrypted File |
 * | 13 Bytes, ASCII  | 64 Bytes, random   | 16 Bytes, random      | 16 Bytes       | (N-109) Bytes  |
 * +------------------+--------------------+-----------------------+----------------+----------------+
 *
 * Legacy format (V001) did not include the version header:
 * +--------------------+-----------------------+----------------+----------------+
 * | Salt               | Initialization Vector | Auth Tag       | Payload        |
 * | Used to derive key | AES GCM XOR Init      | Data Integrity | Encrypted File |
 * | 64 Bytes, random   | 16 Bytes, random      | 16 Bytes       | (N-96) Bytes   |
 * +--------------------+-----------------------+----------------+----------------+
 *
 * A huge thank you to: https://medium.com/@brandonstilson/lets-encrypt-files-with-node-85037bea8c0e
 *
 *
 * WARNING: DO NOT THROW ANY ERRORS IN THIS FUNCTION. TO "THROW" AN ERROR, RETURN A STRING TO THE RENDERER PROCESS THAT BEGINS WITH ERROR_MESSAGE_PREFIX.
 *
 * @param  {String}            filePath      Absolute path of unencrypted file.
 * @param  {crypto.BinaryLike} password      Password to encrypt file with.
 * @return {String}                          Absolute path of encrypted file, OR an error message which is prefixed with ERROR_MESSAGE_PREFIX.
 *                                           Do not try to throw an error and have it returned to the renderer process. It will not work.
 */
export async function encryptFile(
  filePath: string,
  password: crypto.BinaryLike,
): Promise<string> {
  let fileDataToEncrypt: Buffer;
  let filePathToEncrypt: string = filePath;
  let createdZipFileForFolderEncryption = false;

  // Check if the path is a directory
  const isDirectory = (await promisify(fs.stat)(filePath)).isDirectory();
  if (isDirectory) {
    // Zip the folder before encrypting
    const zipFilePath = generateValidZipFilePath(filePath);
    try {
      await zipDirectory(filePath, zipFilePath);
      filePathToEncrypt = zipFilePath;
      createdZipFileForFolderEncryption = true;
    } catch (error) {
      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
      }
      return `${ERROR_MESSAGE_PREFIX}: Failed to encrypt ${filePath}. Something went wrong while zipping the folder.`;
    }
  }

  // Read unencrypted file (or zipped folder) into buffer, or return an error message if we fail to read the file
  try {
    fileDataToEncrypt = await readFileWithPromise(filePathToEncrypt)
      .then((data) => {
        return data;
      })
      .catch((error) => {
        // if createdZipFileForFolderEncryption, filePathToEncrypt should always be a zip, but double checking just in case
        if (
          createdZipFileForFolderEncryption &&
          filePathToEncrypt.endsWith('.zip')
        ) {
          fs.unlinkSync(filePathToEncrypt);
        }
        throw error; // This will be caught by the next catch block, which can return an error message from outside the callback
      });
  } catch (error) {
    if (isDirectory) {
      return `${ERROR_MESSAGE_PREFIX}: Failed to encrypt ${filePath}. Something went wrong while zipping the folder.`;
    }
    return `${ERROR_MESSAGE_PREFIX}: ${filePathToEncrypt} failed to be opened for reading.`;
  }

  const salt = crypto.randomBytes(64);
  const derivedKey = createDerivedKey(salt, password);
  const initializationVector = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    AES_256_GCM,
    derivedKey,
    initializationVector,
  );

  const encryptedFilePath = generateValidEncryptedFilePath(filePathToEncrypt);

  const unencryptedFileDataSHA256 = sha256Hash(fileDataToEncrypt);

  // Encrypt the file data, and then disable the cipher
  const cipherText = cipher.update(fileDataToEncrypt);
  cipher.final();

  const authTag = cipher.getAuthTag();

  // Write version header, salt, IV, and authTag to encrypted file, and then the encrypted file data afterwards
  const encryptedFileDataWithMetadata = Buffer.concat([
    Buffer.from(VERSION_HEADER, 'ascii'), // V002 format includes version header
    salt,
    initializationVector,
    Buffer.from(authTag),
    cipherText,
  ]);

  try {
    await writeFileWithPromise(
      encryptedFilePath,
      encryptedFileDataWithMetadata,
    ).catch((error) => {
      try {
        fs.unlinkSync(encryptedFilePath); // Delete the (improperly) encrypted file, if it exists
      } catch (err) {
        throw error; // This will be caught by the next catch block, which can return an error message from outside the callback
      }
    });
  } catch (error) {
    return `${ERROR_MESSAGE_PREFIX}: ${encryptedFilePath} failed to be written (error inside writeFileWithPromise()).`;
  }

  // If the file was not written, return an error message
  if (!fs.existsSync(encryptedFilePath)) {
    return `${ERROR_MESSAGE_PREFIX}: ${encryptedFilePath} failed to be written.`;
  }

  // Clean up zip file after encryption process is done, if we created it
  if (createdZipFileForFolderEncryption && filePathToEncrypt.endsWith('.zip')) {
    try {
      log.debug('Cleaning up temporary zip file:', filePathToEncrypt);
      fs.unlinkSync(filePathToEncrypt);
    } catch (error) {
      log.error('Failed to clean up temporary zip file:', filePathToEncrypt);
    }
  }

  // If it was written, let's validate that decrypting it will give us the same SHA256 hash as the encrypted data
  const decryptedFileBufferOrError = await getDecryptedFileContents(
    encryptedFilePath,
    password,
    true, // isVerification
  ).catch((error) => {
    return convertErrorToStringForRendererProcess(error, encryptedFilePath); // This returns a string error message
  });

  // If it's not a Buffer (i.e. it's an error message), return it
  if (typeof decryptedFileBufferOrError === 'string') {
    return decryptedFileBufferOrError;
  }

  // Validate the SHA256 hash of the decrypted file
  const decryptedFileSHA256 = sha256Hash(decryptedFileBufferOrError);
  if (unencryptedFileDataSHA256 !== decryptedFileSHA256) {
    fs.unlinkSync(encryptedFilePath);
    return `${ERROR_MESSAGE_PREFIX}: ${encryptedFilePath} failed to be verified after encryption. It's likely corrupted. The hash of the data before encryption was ${unencryptedFileDataSHA256}, and the hash of the data after decryption was ${decryptedFileSHA256}.`;
  }

  log.success('Successfully encrypted file: ', encryptedFilePath);
  return encryptedFilePath;
}

/**
 * Decrypts a file and writes it to disk.
 *
 * WARNING: DO NOT THROW ANY ERRORS IN THIS FUNCTION. TO "THROW" AN ERROR, RETURN A STRING TO THE RENDERER PROCESS THAT BEGINS WITH ERROR_MESSAGE_PREFIX.
 *
 * @param  {String} filePath      Absolute path of encrypted file.
 * @param  {crypto.BinaryLike} decryptionKey Unverified decryption key supplied by user.
 * @return {String}               Absolute path of unencrypted file, OR an error message which is prefixed with ERROR_MESSAGE_PREFIX.
 */
export async function decryptFile(
  filePath: string,
  decryptionKey: crypto.BinaryLike,
): Promise<string> {
  // Validate that the file is a valid deadbolt encrypted file before attempting decryption
  if (!isDeadboltEncryptedFile(filePath)) {
    const prettyFilePath = prettyPrintFilePath(filePath);
    return `${ERROR_MESSAGE_PREFIX}: \`${prettyFilePath}\` is not a valid deadbolt encrypted file.\nPlease ensure you've selected a file encrypted with deadbolt.`;
  }

  const decryptedFilePath = generateValidDecryptedFilePath(filePath);
  let decryptedText: Buffer | string;
  try {
    decryptedText = await getDecryptedFileContents(filePath, decryptionKey);
  } catch (error) {
    const err = error as Error;
    return convertErrorToStringForRendererProcess(err, filePath);
  }
  try {
    await writeFileWithPromise(decryptedFilePath, decryptedText).catch(
      (error) => {
        throw error; // This will be caught by the next catch block, which can return an error message from outside the callback
      },
    );

    if (fs.existsSync(decryptedFilePath)) {
      log.success('Successfully decrypted file: ', decryptedFilePath);
      return decryptedFilePath;
    }
    return `${ERROR_MESSAGE_PREFIX}: ${decryptedFilePath} failed to be written.`;
  } catch (error) {
    return `${ERROR_MESSAGE_PREFIX}: ${decryptedFilePath} failed to be written.`;
  }
}
