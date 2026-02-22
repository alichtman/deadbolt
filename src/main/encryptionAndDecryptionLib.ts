/* eslint-disable spaced-comment */

/**************
 * Constants
 *************/

import fs from 'fs';
import crypto from 'crypto';
import { promisify } from 'util';
import archiver from 'archiver';
import * as argon2 from '@node-rs/argon2';
import log from './logger';
import DecryptionWrongPasswordError from './error-types/DecryptionWrongPasswordError';
import EncryptedFileMissingMetadataError from './error-types/EncryptedFileMissingMetadataError';
import FileReadError from './error-types/FileReadError';
import FileWriteError from './error-types/FileWriteError';
import UnsupportedDeadboltFileVersion from './error-types/UnsupportedDeadboltFileVersion';
import Argon2OutOfMemoryError from './error-types/Argon2OutOfMemoryError';
import prettyPrintFilePath, {
  generateValidDecryptedFilePath,
  generateValidEncryptedFilePath,
  generateValidZipFilePath,
  isDeadboltEncryptedFile,
  VERSION_HEADER_PREFIX,
  VERSION_HEADER_LEN,
} from './fileUtils';
import EncryptionOrDecryptionEnum from './EncryptionOrDecryptionEnum';

const AES_256_GCM = 'aes-256-gcm';

// When DEADBOLT_ARGON2_TEST_PARAMS=1 (set by Jest setupFiles), use minimal
// Argon2id parameters so tests complete in milliseconds.
// Production always uses RFC 9106 FIRST recommendation parameters.
const ARGON2_TEST_MODE = process.env.DEADBOLT_ARGON2_TEST_PARAMS === '1';

// Version constants for binary format
const CURRENT_VERSION = '002';
const VERSION_HEADER = `${VERSION_HEADER_PREFIX}${CURRENT_VERSION}`; // "DEADBOLT_V002"

// Deadbolt file format specification
type DeadboltFileFormat =
  | {
      kdfType: 'pbkdf2';
      pbkdf2Iterations: number;
      saltOffset: number;
      ivOffset: number;
      authTagOffset: number;
      metadataLength: number;
    }
  | {
      kdfType: 'argon2id';
      argon2Params: {
        memoryCost: number; // in KiB
        timeCost: number; // iterations
        parallelism: number; // threads
      };
      saltOffset: number;
      ivOffset: number;
      authTagOffset: number;
      metadataLength: number;
    };

// Format specifications for each version
const VERSION_FORMATS: Record<string, DeadboltFileFormat> = {
  '001': {
    kdfType: 'pbkdf2',
    pbkdf2Iterations: 10000,
    saltOffset: 0,
    ivOffset: 64,
    authTagOffset: 80,
    metadataLength: 96, // salt(64) + IV(16) + authTag(16)
  },
  '002': {
    kdfType: 'argon2id',
    argon2Params: {
      memoryCost: ARGON2_TEST_MODE ? 64 : 2097152, // 64 KiB vs 2 GiB (RFC 9106 FIRST)
      timeCost: 1,
      parallelism: ARGON2_TEST_MODE ? 1 : 4, // 1 lane vs 4 lanes (RFC 9106 FIRST)
    },
    saltOffset: VERSION_HEADER_LEN, // 13 bytes
    ivOffset: VERSION_HEADER_LEN + 16, // 29 bytes
    authTagOffset: VERSION_HEADER_LEN + 32, // 45 bytes
    metadataLength: VERSION_HEADER_LEN + 48, // version(13) + salt(16) + IV(16) + authTag(16) = 61 bytes
  },
};

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
      return `${ERROR_MESSAGE_PREFIX}: Failed to decrypt \`${prettyFilePath}\`\nIs the password correct? The file may also be corrupted.`;

    case error instanceof EncryptedFileMissingMetadataError:
      return `${ERROR_MESSAGE_PREFIX}: \`${prettyFilePath}\` is missing metadata.\nIt's likely corrupted.`;

    case error instanceof FileReadError:
      return `${ERROR_MESSAGE_PREFIX}: Failed to retrieve file contents of \`${prettyFilePath}\` for ${(error as FileReadError).operation}.`;

    case error instanceof UnsupportedDeadboltFileVersion:
      return `${ERROR_MESSAGE_PREFIX}: \`${prettyFilePath}\` is detected as being V${(error as UnsupportedDeadboltFileVersion).version}, which is not a supported value. Valid values: ${Object.keys(VERSION_FORMATS).join(', ')}.`;

    case error instanceof Argon2OutOfMemoryError:
      return `${ERROR_MESSAGE_PREFIX}: \`${prettyFilePath}\` could not be processed: Argon2id ran out of memory.\nDeadbolt requires ~2 GiB of free RAM. Close other applications and try again.`;

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
 * Converts crypto.BinaryLike to Buffer.
 * BinaryLike = string | NodeJS.ArrayBufferView, where ArrayBufferView includes
 * Uint8Array, DataView, etc. This ensures we always get a Buffer for argon2.
 */
function ensureBufferForArgon2(data: crypto.BinaryLike): Buffer {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (typeof data === 'string') {
    return Buffer.from(data, 'utf8');
  }
  // NodeJS.ArrayBufferView (Uint8Array, DataView, etc.)
  // Access underlying ArrayBuffer with proper offset and length
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

/**
 * Returns a derived key to be used for AES encryption.
 * Uses PBKDF2-SHA512 for V001 (legacy) or Argon2id for V002.
 * @param  {Buffer} salt               64 byte random salt
 * @param  {string} encryptionKey      User's entered encryption key
 * @param  {DeadboltFileFormat} format File format specification
 * @return {Promise<Buffer>}           32-byte key for AES-256-GCM
 */
async function createDerivedKey(
  salt: Buffer,
  encryptionKey: crypto.BinaryLike,
  format: DeadboltFileFormat,
): Promise<Buffer> {
  switch (format.kdfType) {
    case 'argon2id': {
      try {
        const encryptionKeyBuffer = ensureBufferForArgon2(encryptionKey);

        // Use hashRaw() instead of hash() to get raw bytes for key derivation.
        // hashRaw() returns a Buffer of raw hash bytes (32 bytes for AES-256).
        // hash() returns a PHC-encoded string like "$argon2id$v=19$m=19456,t=2,p=1$...",
        // which is used for password storage/verification, not encryption key derivation.
        const hash = await argon2.hashRaw(encryptionKeyBuffer, {
          algorithm: argon2.Algorithm.Argon2id,
          memoryCost: format.argon2Params.memoryCost,
          timeCost: format.argon2Params.timeCost,
          parallelism: format.argon2Params.parallelism,
          outputLen: 32, // 32 bytes = 256 bits
          salt: salt,
        });

        return hash;
      } catch (error) {
        const err = error as Error;
        log.error('Failed to load or execute argon2:', err.message);
        if (err.message.toLowerCase().includes('memory allocation')) {
          throw new Argon2OutOfMemoryError();
        }
        throw error;
      }
    }

    case 'pbkdf2': {
      // V001 legacy PBKDF2
      return crypto.pbkdf2Sync(
        encryptionKey,
        salt,
        format.pbkdf2Iterations,
        32,
        'sha512',
      );
    }

    default: {
      // Exhaustive check - will error if we add new KDF types without handling them
      const exhaustiveCheck: never = format;
      throw new Error(`Unsupported KDF type`);
    }
  }
}

/**
 * Detects the version of an encrypted file and returns its format specification.
 * @param encryptedFilePath Path to the encrypted file
 * @returns Object containing version string and format specification
 */
function detectDeadboltFileFormat(encryptedFilePath: string): {
  version: string;
  detectedFileFormat: DeadboltFileFormat;
} {
  let fd: number | null = null;
  try {
    fd = fs.openSync(encryptedFilePath, 'r');
    const versionBuffer = Buffer.alloc(VERSION_HEADER_LEN);
    fs.readSync(fd, versionBuffer, 0, VERSION_HEADER_LEN, 0);

    const versionString = versionBuffer.toString('ascii');

    // Check if file starts with "DEADBOLT_V"
    if (versionString.startsWith(VERSION_HEADER_PREFIX)) {
      // Extract version number (last 3 digits)
      const version = versionString.substring(VERSION_HEADER_PREFIX.length);
      const format = VERSION_FORMATS[version];

      if (!format) {
        throw new UnsupportedDeadboltFileVersion(version);
      }

      return { version, detectedFileFormat: format };
    }

    // Legacy format (no version header)
    return { version: '001', detectedFileFormat: VERSION_FORMATS['001'] };
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (e) {
        log.error('Failed to close file descriptor:', e);
      }
    }
  }
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
  // Detect file version and get format specification
  const { detectedFileFormat } = detectDeadboltFileFormat(encryptedFilePath);

  // Read salt, IV, and authTag from file using format offsets
  const fd = fs.openSync(encryptedFilePath, 'r');
  // Calculate salt length from format offsets (V001: 64 bytes, V002: 16 bytes)
  const saltLength =
    detectedFileFormat.ivOffset - detectedFileFormat.saltOffset;
  const salt = Buffer.alloc(saltLength);
  fs.readSync(fd, salt, 0, saltLength, detectedFileFormat.saltOffset);

  const initializationVector = Buffer.alloc(16);
  fs.readSync(fd, initializationVector, 0, 16, detectedFileFormat.ivOffset);

  const authTag = Buffer.alloc(16);
  fs.readSync(fd, authTag, 0, 16, detectedFileFormat.authTagOffset);
  fs.closeSync(fd);

  // Decrypt the cipher text using the format's KDF
  const derivedKey = await createDerivedKey(
    salt,
    decryptionKey,
    detectedFileFormat,
  );
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
      if (data.length < detectedFileFormat.metadataLength && data.length > 0) {
        throw new EncryptedFileMissingMetadataError();
      } else if (data.length === 0) {
        throw new FileReadError(
          isVerification
            ? EncryptionOrDecryptionEnum.DECRYPTION_VERIFICATION_OF_ENCRYPTION
            : EncryptionOrDecryptionEnum.DECRYPTION,
        );
      }
      return data.subarray(detectedFileFormat.metadataLength);
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
 * +---------------------+--------------------+-----------------------+----------------+----------------+
 * | Version Header      | Salt               | Initialization Vector | Auth Tag       | Payload        |
 * | DEADBOLT_V###       | Used to derive key | AES GCM XOR Init      | Data Integrity | Encrypted File |
 * | 13 Bytes, ASCII     | 16 Bytes, random   | 16 Bytes, random      | 16 Bytes       | (N-61) Bytes   |
 * | (e.g. DEADBOLT_V002)| (128 bits)         | (128 bits)            | (128 bits)     |                |
 * +---------------------+--------------------+-----------------------+----------------+----------------+
 *
 * Legacy format (V001) did not include the version header:
 * +--------------------+-----------------------+----------------+----------------+
 * | Salt               | Initialization Vector | Auth Tag       | Payload        |
 * | Used to derive key | AES GCM XOR Init      | Data Integrity | Encrypted File |
 * | 64 Bytes, random   | 16 Bytes, random      | 16 Bytes       | (N-96) Bytes   |
 * | (512 bits)         | (128 bits)            | (128 bits)     |                |
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
  let isDirectory: boolean;
  try {
    isDirectory = (await promisify(fs.stat)(filePath)).isDirectory();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    const prettyFilePath = prettyPrintFilePath(filePath);
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      return `${ERROR_MESSAGE_PREFIX}: Permission denied when trying to read \`${prettyFilePath}\`.\nPlease check file permissions.`;
    }
    return `${ERROR_MESSAGE_PREFIX}: Failed to access \`${prettyFilePath}\`: ${err.message}`;
  }
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

  // Calculate salt length from current format specification (V001: 64, V002: 16)
  const currentFormat = VERSION_FORMATS[CURRENT_VERSION];
  const saltLength = currentFormat.ivOffset - currentFormat.saltOffset;
  const salt = crypto.randomBytes(saltLength);
  let derivedKey: Buffer;
  try {
    derivedKey = await createDerivedKey(salt, password, currentFormat);
  } catch (error) {
    return convertErrorToStringForRendererProcess(error as Error, filePath);
  }
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

  const aesGcmAuthTag = cipher.getAuthTag();

  // Write version header, salt, IV, and authTag to encrypted file, and then the encrypted file data afterwards
  const encryptedFileDataWithMetadata = Buffer.concat([
    Buffer.from(VERSION_HEADER, 'ascii'), // V002 format includes version header
    salt,
    initializationVector,
    Buffer.from(aesGcmAuthTag),
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
  try {
    if (!isDeadboltEncryptedFile(filePath)) {
      const prettyFilePath = prettyPrintFilePath(filePath);
      return `${ERROR_MESSAGE_PREFIX}: \`${prettyFilePath}\` is not a valid deadbolt encrypted file.\nPlease ensure you've selected a file encrypted with deadbolt.`;
    }
  } catch (error) {
    // Handle I/O errors from validation (e.g., permission errors)
    const prettyFilePath = prettyPrintFilePath(filePath);
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      return `${ERROR_MESSAGE_PREFIX}: Permission denied when trying to read \`${prettyFilePath}\`.\nPlease check file permissions.`;
    }
    return `${ERROR_MESSAGE_PREFIX}: Failed to read \`${prettyFilePath}\`: ${err.message}`;
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
