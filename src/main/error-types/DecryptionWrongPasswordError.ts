export default class DecryptionWrongPasswordError extends Error {
  constructor() {
    super();
    this.name = 'DecryptionWrongPasswordError';
  }
}
