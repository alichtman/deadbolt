/***********
 * Constants
 ***********/

import fs from 'fs';
import crypto from 'crypto';

export const ENCRYPTED_FILE_EXTENSION = '.dbolt';
const AES_256_GCM = 'aes-256-gcm';
const METADATA_LEN = 96;

/*************
 * Error Prefix
 ************/

// Electron doesn't let you pass custom error messages from IPCMain to the renderer process
// https://github.com/electron/electron/issues/24427
// There are some workarounds floating around, like https://m-t-a.medium.com/electron-getting-custom-error-messages-from-ipc-main-617916e85151
// but we're going to galaxy brain it and just return a string to the renderer process with a prefix to indicate that it's an error.
// ....
const ERROR_MESSAGE_PREFIX = 'ERROR_FROM_ELECTRON_MAIN_THREAD';

enum EncryptionOrDecryption {
  ENCRYPTION = 'encryption',
  DECRYPTION_VERIFICATION_OF_ENCRYPTION = 'verification of encryption (which requires decryption)',
  DECRYPTION = 'decryption',
}

class FileWriteError extends Error {
  public operation: EncryptionOrDecryption;
  constructor(operation: EncryptionOrDecryption) {
    super();
    this.name = 'FileWriteError';
    this.operation = operation;
  }
}

class FileReadError extends Error {
  public operation: EncryptionOrDecryption;

  constructor(operation: EncryptionOrDecryption) {
    super();
    this.name = 'FileReadError';
    this.operation = operation;
  }
}

class EncryptedFileMissingMetadataError extends Error {
  constructor() {
    super();
    this.name = 'EncryptedFileMissingMetadataError';
  }
}

class DecryptionWrongPasswordError extends Error {
  constructor() {
    super();
    this.name = 'DecryptionWrongPasswordError';
  }
}

function convertErrorToStringForRendererProcess(
  error: Error,
  filePath: string,
): string {
  // Can't figure out how to make this an exhaustive switch statement AND ALSO use legit error classes the way I am.
  // sorry future @alichtman
  if (error instanceof DecryptionWrongPasswordError) {
    return `${ERROR_MESSAGE_PREFIX}: ${filePath} failed to be decrypted. Incorrect password.`;
  } else if (error instanceof EncryptedFileMissingMetadataError) {
    return `${ERROR_MESSAGE_PREFIX}: ${filePath} is missing metadata. It's likely corrupted.`;
  } else if (error instanceof FileReadError) {
    return `${ERROR_MESSAGE_PREFIX}: Failed to retrieve file contents of ${filePath} for ${error.operation}.`;
  } else if (error instanceof FileWriteError) {
    return `${ERROR_MESSAGE_PREFIX}: ${filePath} failed to be written during ${error.operation}.`;
  } else {
    return `${ERROR_MESSAGE_PREFIX}: Unhandled error. Please report this to https://github.com/alichtman/deadbolt/issues/new with as much detail about what you were doing as possible. ${error}`;
  }
}

/***********
 * Utilities
 ***********/

/**
 * Replace last instance of search in input with replacement
 * @param {String} input Input string
 * @param {String} search Substring to search for
 * @param {String} replacement Substring to replace with
 */
function replaceLast(
  input: string,
  search: string,
  replacement: string,
): string {
  // Find last occurrence
  const index = input.lastIndexOf(search);
  if (index === -1) {
    return input;
  }
  // Replace occurrence
  return (
    input.substring(0, index) +
    replacement +
    input.substring(index + search.length)
  );
}

/**
 * Writes the decrypted file to the same directory as the encrypted file. Encrypted files are suffixed with .dbolt, so we remove that suffix.
 * If the file already exists, we append -NUMBER to the end of the filename, where NUMBER is the lowest number that doesn't conflict with an existing file.
 *
 * Example:
 * - If the encrypted file is /path/to/file.txt.dbolt, the decrypted file will be /path/to/file.txt
 * - If the decrypted file already exists, we will try /path/to/file-1.txt, /path/to/file-2.txt, etc.
 * @param encryptedFilePath
 * @returns
 */
function generateValidDecryptedFilePath(encryptedFilePath: string) {
  {
    let baseFilePath = replaceLast(
      encryptedFilePath,
      ENCRYPTED_FILE_EXTENSION,
      '',
    );
    let candidateFilePath = baseFilePath;
    let counter = 1;

    while (fs.existsSync(candidateFilePath)) {
      candidateFilePath = `${baseFilePath}-${counter}`;
      counter++;
    }

    return candidateFilePath;
  }
}

/**
 * Generates a valid encrypted file path by appending the encrypted file extension.
 * If the file already exists, appends -NUMBER to the end of the filename, where NUMBER is the lowest number that doesn't conflict with an existing file.
 *
 * Example:
 * - If the original file is /path/to/file.txt, the encrypted file will be /path/to/file.txt.dbolt
 * - If the encrypted file already exists, it will try /path/to/file-1.txt.dbolt, /path/to/file-2.txt.dbolt, etc.
 * @param originalFilePath
 * @returns
 */
function generateValidEncryptedFilePath(originalFilePath: string): string {
  let baseFilePath = `${originalFilePath}${ENCRYPTED_FILE_EXTENSION}`;
  const lastPeriodIndex = originalFilePath.lastIndexOf('.');
  const originalFileExtension = originalFilePath.substring(lastPeriodIndex);
  const baseFilePathWithoutExtension = originalFilePath.substring(
    0,
    lastPeriodIndex,
  );
  let candidateFilePath = baseFilePath;
  let counter = 1;

  while (fs.existsSync(candidateFilePath)) {
    candidateFilePath = `${baseFilePathWithoutExtension}-${counter}${originalFileExtension}${ENCRYPTED_FILE_EXTENSION}`;
    counter++;
  }

  return candidateFilePath;
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
        reject('Failed to write');
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
        reject('Failed to read');
      } else {
        resolve(data);
      }
    });
  });
}

function sha256Hash(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/********************
 * AES-256 Encryption
 ********************/

/**
 * Returns a SHA512 digest to be used as the key for AES encryption. Uses a 64 byte salt with 10,000 iterations of PBKDF2
 * Follows the NIST standards described here: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf
 * @param  {Buffer} salt          16 byte random salt
 * @param  {string} encryptionKey User's entered encryption key
 * @return {Buffer}               SHA512 hash that will be used as the IV.
 */
function createDerivedKey(
  salt: crypto.BinaryLike,
  encryptionKey: crypto.BinaryLike,
): Buffer {
  return crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    10000,
    32, // This value is in bytes
    'sha512',
  );
}

/**
 * Encrypts a file using this format:
 * (https://gist.github.com/AndiDittrich/4629e7db04819244e843)
 * +--------------------+-----------------------+----------------+----------------+
 * | Salt               | Initialization Vector | Auth Tag       | Payload        |
 * | Used to derive key | AES GCM XOR Init      | Data Integrity | Encrypted File |
 * | 64 Bytes, random   | 16 Bytes, random      | 16 Bytes       | (N-96) Bytes   |
 * +--------------------+-----------------------+----------------+----------------+
 *
 * A huge thank you to: https://medium.com/@brandonstilson/lets-encrypt-files-with-node-85037bea8c0e
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
  // Create cipher
  const salt = crypto.randomBytes(64);
  const derivedKey = createDerivedKey(salt, password);
  const initializationVector = crypto.randomBytes(16);
  let cipher = crypto.createCipheriv(
    AES_256_GCM,
    derivedKey,
    initializationVector,
  );

  const encryptedFilePath = generateValidEncryptedFilePath(filePath);

  // Read unencrypted file into buffer, or return an error message if we fail to read the file
  let fileDataToEncrypt: Buffer;
  try {
    fileDataToEncrypt = await readFileWithPromise(filePath)
      .then((data) => {
        return data;
      })
      .catch((_error) => {
        throw new Error(); // This will be caught by the next catch block, which can return an error message from outside the callback
      });
  } catch (error) {
    return `${ERROR_MESSAGE_PREFIX}: ${filePath} failed to be opened for reading.`;
  }

  const unencryptedFileDataSHA256 = sha256Hash(fileDataToEncrypt);

  // Encrypt the file data, and then disable the cipher
  const cipherText = cipher.update(fileDataToEncrypt);
  cipher.final();

  const authTag = cipher.getAuthTag();

  // Write salt, IV, and authTag to encrypted file, and then the encrypted file data afterwards
  const encryptedFileDataWithMetadata = Buffer.concat([
    salt,
    initializationVector,
    Buffer.from(authTag),
    cipherText,
  ]);

  try {
    await writeFileWithPromise(
      encryptedFilePath,
      encryptedFileDataWithMetadata,
    ).catch((_error) => {
      try {
        fs.unlinkSync(encryptedFilePath); // Delete the (improperly) encrypted file, if it exists
      } catch (error) {
        throw new Error(); // This will be caught by the next catch block, which can return an error message from outside the callback
      }
    });
  } catch (error) {
    return `${ERROR_MESSAGE_PREFIX}: ${encryptedFilePath} failed to be written (error inside writeFileWithPromise()).`;
  }

  // If the file was not written, return an error message
  if (!fs.existsSync(encryptedFilePath)) {
    return `${ERROR_MESSAGE_PREFIX}: ${encryptedFilePath} failed to be written.`;
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

  console.log('Successfully encrypted file: ', encryptedFilePath);
  return encryptedFilePath;
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
  // Read salt, IV and authTag from beginning of file.
  const fd = fs.openSync(encryptedFilePath, 'r');
  const salt = Buffer.alloc(64);
  fs.readSync(fd, salt, 0, 64, 0);

  const initializationVector = Buffer.alloc(16);
  fs.readSync(fd, initializationVector, 0, 16, 64);

  const authTag = Buffer.alloc(16);
  fs.readSync(fd, authTag, 0, 16, 80);
  fs.closeSync(fd);

  // Decrypt the cipher text
  const derivedKey = createDerivedKey(salt, decryptionKey);
  const decrypt = crypto.createDecipheriv(
    AES_256_GCM,
    derivedKey,
    initializationVector,
  );

  // Handle decryption errors. This will throw when we call decrypt.final() if the password is incorrect.
  decrypt.setAuthTag(authTag);

  // Read encrypted file, and drop the first METADATA_LEN bytes
  const cipherText = await readFileWithPromise(encryptedFilePath)
    .then((data) => {
      if (data.length < METADATA_LEN && data.length > 0) {
        throw new EncryptedFileMissingMetadataError(); // This will be caught by the next catch block, which can return an error message from outside the callback
      } else if (data.length === 0) {
        throw new FileReadError(
          isVerification
            ? EncryptionOrDecryption.DECRYPTION_VERIFICATION_OF_ENCRYPTION
            : EncryptionOrDecryption.DECRYPTION,
        );
      }
      return data.subarray(METADATA_LEN);
    })
    .catch((error: Error) => {
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
      (_error) => {
        throw new Error(); // This will be caught by the next catch block, which can return an error message from outside the callback
      },
    );

    if (fs.existsSync(decryptedFilePath)) {
      console.log('Successfully decrypted file: ', decryptedFilePath);
      return decryptedFilePath;
    } else {
      return `${ERROR_MESSAGE_PREFIX}: ${decryptedFilePath} failed to be written.`;
    }
  } catch (error) {
    return `${ERROR_MESSAGE_PREFIX}: ${decryptedFilePath} failed to be written.`;
  }
}
