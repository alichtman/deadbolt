/***********
 * Constants
 ***********/

import fs from "fs";
import crypto from 'crypto';

export const ENCRYPTED_FILE_EXTENSION = ".dbolt";
const AES_256_GCM = "aes-256-gcm";
const METADATA_LEN = 96;

/*************
 * Error Types
 ************/

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionError";
  }
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
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
function replaceLast(input: string, search: string, replacement: string): string {
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
  let decryptedFilePath = replaceLast(filePath, ENCRYPTED_FILE_EXTENSION, "");
  let splitPath = decryptedFilePath.split(".");
  splitPath.splice(splitPath.length - 1, 0, "dbolt");
  decryptedFilePath = splitPath.join(".");

  return decryptedFilePath;
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
function createDerivedKey(salt: crypto.BinaryLike, encryptionKey: crypto.BinaryLike): Buffer {
  return crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    10000,
    32, // This value is in bytes
    "sha512",
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
 * @return {String}                          Absolute path of encrypted file.
 */
export function encryptFile(filePath: string, encryptionKey: crypto.BinaryLike): string {
  // Create cipher
  const salt = crypto.randomBytes(64);
  console.log("Salt and encryption key:", salt, encryptionKey);
  const derivedKey = createDerivedKey(salt, encryptionKey);
  const initializationVector = crypto.randomBytes(16);
  let cipher = crypto.createCipheriv(
    AES_256_GCM,
    derivedKey,
    initializationVector,
  );

  const encryptedFilePath = `${filePath}${ENCRYPTED_FILE_EXTENSION}`;
  const tempAuthTag = Buffer.alloc(16, 0xff);
  const writeStream = fs.createWriteStream(encryptedFilePath, { flags: "w+" }).on("error", () => {
    // TODO: When this error is thrown, it's not caught for some reason, and crashes the app. The one below is caught just fine. idk!
    throw new EncryptionError(`${encryptedFilePath} failed to be opened for writing. Is the directory writable?`);
  });

  // Write salt, IV, and temp auth tag to encrypted file.
  // The temp auth tag will be replaced with a real auth tag later.
  writeStream.write(salt);
  writeStream.write(initializationVector);
  writeStream.write(tempAuthTag);

  // Encrypt file and write it to encrypted dest file
  const readStream = fs.createReadStream(filePath)
  readStream
    .pipe(cipher)
    .pipe(writeStream)
    .on("finish", () => {
      const realAuthTag = cipher.getAuthTag();
      const fd = fs.openSync(encryptedFilePath, "r+");
      fs.write(fd, realAuthTag, 0, 16, 80, () => { });
      readStream.close(() => { });
      writeStream.close(() => { });
    });

  if (fs.existsSync(encryptedFilePath)) {
    console.log("Encrypted file path exists! ", encryptedFilePath);
    return encryptedFilePath;
  } else {
    throw new EncryptionError(`${encryptedFilePath} failed to be written.`);
  }
}

/**
 * Decrypts a file.
 * @param  {String} filePath      Absolute path of encrypted file.
 * @param  {crypto.BinaryLike} decryptionKey Unverified decryption key supplied by user.
 * @return {String}               Absolute path of unencrypted file.
 */
export function decryptFile(filePath: string, decryptionKey: crypto.BinaryLike): string | Error {
  // Read salt, IV and authTag from beginning of file.
  const decryptedFilePath = createDecryptedFilePath(filePath);
  const fd = fs.openSync(filePath, "r");
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
  )

  // Handle decryption errors. This will throw if the password is incorrect.
  decrypt.setAuthTag(authTag);

  const encryptedFileReadStream = fs.createReadStream(filePath, {
    start: METADATA_LEN,
  });
  encryptedFileReadStream
    .pipe(decrypt)
    .on("error", () => {
      fs.unlinkSync(decryptedFilePath); // Delete the (improperly) decrypted file, if it exists
      throw new
        DecryptionError("The password is incorrect, the file can't be read, or the destination being written to is inaccessible.");
    })
    .pipe(
      fs.createWriteStream(decryptedFilePath)
    );

  return decryptedFilePath;
}

