import fs from 'fs';
import path from 'path';
import {
  generateValidEncryptedFilePath,
  generateValidDecryptedFilePath,
} from '../main/fileUtils';

jest.mock('../main/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

describe('collision paths within dotted directories', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each([
    ['README', 'README-1'],
    ['file.txt', 'file-1.txt'],
    ['.config', '.config-1'],
  ])('%s stays in its directory', (name, nextName) => {
    const original = path.join('synthetic.dir', name);
    const next = path.join('synthetic.dir', nextName);
    const exists = jest.spyOn(fs, 'existsSync');

    exists.mockImplementation((candidate) => candidate === `${original}.deadbolt`);
    expect(generateValidEncryptedFilePath(original)).toBe(`${next}.deadbolt`);

    exists.mockImplementation((candidate) => candidate === original);
    expect(generateValidDecryptedFilePath(`${original}.deadbolt`)).toBe(next);
  });
});
