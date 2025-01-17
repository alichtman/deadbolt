import { EncryptionOrDecryption } from '../encryptionAndDecryptionLib';

export default class FileWriteError extends Error {
  public operation: EncryptionOrDecryption;

  constructor(operation: EncryptionOrDecryption) {
    super();
    this.name = 'FileWriteError';
    this.operation = operation;
  }
}
