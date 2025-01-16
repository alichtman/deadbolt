export default class EncryptedFileMissingMetadataError extends Error {
  constructor() {
    super();
    this.name = 'EncryptedFileMissingMetadataError';
  }
}
