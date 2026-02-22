export default class UnsupportedDeadboltFileVersion extends Error {
  version: string;

  constructor(version: string) {
    super();
    this.name = 'UnsupportedDeadboltFileVersion';
    this.version = version;
  }
}
