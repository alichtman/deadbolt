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

function createDecryptedFilePath(filePath: string) {
  let decryptedFilePath = replaceLast(filePath, ENCRYPTED_FILE_EXTENSION, '');
  let splitPath = decryptedFilePath.split('.');
  splitPath.splice(splitPath.length - 1, 0, 'dbolt');
  decryptedFilePath = splitPath.join('.');

  return decryptedFilePath;
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
    stream.write(data);
    resolve(path);
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
 * @param  {String}            filePath      Absolute path of unencrypted file.
 * @param  {crypto.BinaryLike} encryptionKey User verified encryption key.
 * @return {String}                          Absolute path of encrypted file, OR an error message which is prefixed with ERROR_MESSAGE_PREFIX.
 *                                           Do not try to throw an error and have it returned to the renderer process. It will not work.
 */
export async function encryptFile(
  filePath: string,
  encryptionKey: crypto.BinaryLike,
): Promise<string> {
  // Create cipher
  const salt = crypto.randomBytes(64);
  console.log('Salt and encryption key:', salt, encryptionKey);
  const derivedKey = createDerivedKey(salt, encryptionKey);
  const initializationVector = crypto.randomBytes(16);
  let cipher = crypto.createCipheriv(
    AES_256_GCM,
    derivedKey,
    initializationVector,
  );

  const encryptedFilePath = `${filePath}${ENCRYPTED_FILE_EXTENSION}`;

  // Read unencrypted file into buffer, or return an error message if we fail to read the file
  let encryptedFileData: Buffer;
  try {
    encryptedFileData = await readFileWithPromise(filePath)
      .then((data) => {
        return data;
      })
      .catch((_error) => {
        throw new Error(); // This will be caught by the next catch block, which can return an error message from outside the callback
      });
  } catch (error) {
    return `${ERROR_MESSAGE_PREFIX}: ${filePath} failed to be opened for reading.`;
  }

  // Encrypt the file data, and then disable the cipher
  const cipherText = cipher.update(encryptedFileData);
  cipher.final();

  const authTag = cipher.getAuthTag();

  // Write salt, IV, and authTag to encrypted file, and then the encrypted file data afterwards
  const encryptedFileDataWithMetadata = Buffer.concat([
    salt,
    initializationVector,
    authTag,
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
    return `${ERROR_MESSAGE_PREFIX}: ${encryptedFilePath} failed to be written.`;
  }

  if (fs.existsSync(encryptedFilePath)) {
    console.log('Successfully encrypted file: ', encryptedFilePath);
    return encryptedFilePath;
  } else {
    return `${ERROR_MESSAGE_PREFIX}: ${encryptedFilePath} failed to be written.`;
  }
}

/**
 * Decrypts a file.
 * @param  {String} filePath      Absolute path of encrypted file.
 * @param  {crypto.BinaryLike} decryptionKey Unverified decryption key supplied by user.
 * @return {String}               Absolute path of unencrypted file, OR an error message which is prefixed with ERROR_MESSAGE_PREFIX.
 *                                Do not try throwing an error here and expecting it to be returned to the renderer process
 */
export async function decryptFile(
  filePath: string,
  decryptionKey: crypto.BinaryLike,
): Promise<string> {
  // Read salt, IV and authTag from beginning of file.
  const decryptedFilePath = createDecryptedFilePath(filePath);
  const fd = fs.openSync(filePath, 'r');
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

  // Handle decryption errors. This will throw if the password is incorrect.
  decrypt.setAuthTag(authTag);

  let cipherText: Buffer;
  try {
    // Read encrypted file, and drop the first METADATA_LEN bytes
    cipherText = await readFileWithPromise(filePath)
      .then((data) => {
        if (data.length < METADATA_LEN) {
          throw new Error(); // This will be caught by the next catch block, which can return an error message from outside the callback
        }
        return data.subarray(METADATA_LEN);
      })
      .catch((_error) => {
        throw new Error(); // This will be caught by the next catch block, which can return an error message from outside the callback
      });
  } catch (error) {
    return `${ERROR_MESSAGE_PREFIX}: Failed to retrieve file contents of ${filePath} for decryption.`;
  }

  let decryptedText: Buffer;
  try {
    decryptedText = decrypt.update(cipherText);
  } catch (error) {
    return `${ERROR_MESSAGE_PREFIX}: Wrong password!`;
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

  return decryptedFilePath;
}
