import EncryptionOrDecryptionEnum from '../EncryptionOrDecryptionEnum';

export default class FileReadError extends Error {
  public operation: EncryptionOrDecryptionEnum;

  constructor(operation: EncryptionOrDecryptionEnum) {
    super();
    this.name = 'FileReadError';
    this.operation = operation;
  }
}
