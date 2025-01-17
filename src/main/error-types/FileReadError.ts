import { EncryptionOrDecryption } from '../encryptionAndDecryptionLib';

export default class FileReadError extends Error {
  public operation: EncryptionOrDecryption;

  constructor(operation: EncryptionOrDecryption) {
    super();
    this.name = 'FileReadError';
    this.operation = operation;
  }
}
