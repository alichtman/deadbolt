export default class Argon2OutOfMemoryError extends Error {
  constructor() {
    super();
    this.name = 'Argon2OutOfMemoryError';
  }
}
