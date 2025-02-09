import { EncryptionOrDecryptionEnum } from '../EncryptionOrDecryptionEnum';

export default class FileWriteError extends Error {
  public operation: EncryptionOrDecryptionEnum;

  constructor(operation: EncryptionOrDecryptionEnum) {
    super();
    this.name = 'FileWriteError';
    this.operation = operation;
  }
}
