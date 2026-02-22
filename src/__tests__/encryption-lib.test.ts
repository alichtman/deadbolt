/**
 * @jest-environment node
 *
 * Unit tests for the encryption and decryption library functions.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  encryptFile,
  decryptFile,
  ERROR_MESSAGE_PREFIX,
} from '../main/encryptionAndDecryptionLib';

describe('Encryption Library Tests', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadbolt-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('File Encryption and Decryption', () => {
    it('should encrypt and decrypt a text file, resulting in identical content', async () => {
      const originalContent =
        'This is a test file for deadbolt CLI encryption.\nIt has multiple lines.\nAnd special characters: !@#$%^&*()';
      const testFilePath = path.join(testDir, 'test.txt');
      const password = 'test-password-123';

      // Create test file
      fs.writeFileSync(testFilePath, originalContent, 'utf8');

      // Encrypt the file
      const encryptedFilePath = await encryptFile(testFilePath, password);
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(encryptedFilePath)).toBe(true);
      expect(encryptedFilePath).toMatch(/\.deadbolt$/);

      // Verify encrypted file is different from original
      const encryptedContent = fs.readFileSync(encryptedFilePath);
      expect(encryptedContent.toString()).not.toBe(originalContent);

      // Decrypt the file
      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(decryptedFilePath)).toBe(true);

      // Verify decrypted content matches original
      const decryptedContent = fs.readFileSync(decryptedFilePath, 'utf8');
      expect(decryptedContent).toBe(originalContent);
    }, 30000);

    it('should encrypt and decrypt a binary file (image), resulting in identical content', async () => {
      // Create a random binary file to simulate an image
      const originalContent = crypto.randomBytes(1024); // 1KB of random data
      const testFilePath = path.join(testDir, 'test-image.png');
      const password = 'image-password-456';

      // Create test binary file
      fs.writeFileSync(testFilePath, originalContent);

      // Encrypt the file
      const encryptedFilePath = await encryptFile(testFilePath, password);
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(encryptedFilePath)).toBe(true);

      // Decrypt the file
      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(decryptedFilePath)).toBe(true);

      // Verify decrypted binary content matches original
      const decryptedContent = fs.readFileSync(decryptedFilePath);
      expect(Buffer.compare(decryptedContent, originalContent)).toBe(0);
    }, 30000);

    it('should encrypt and decrypt an empty file', async () => {
      const testFilePath = path.join(testDir, 'empty.txt');
      const password = 'empty-file-password';

      // Create empty file
      fs.writeFileSync(testFilePath, '');

      // Encrypt the file
      const encryptedFilePath = await encryptFile(testFilePath, password);
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(encryptedFilePath)).toBe(true);

      // Decrypt the file
      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(decryptedFilePath)).toBe(true);

      // Verify decrypted content is still empty
      const decryptedContent = fs.readFileSync(decryptedFilePath, 'utf8');
      expect(decryptedContent).toBe('');
    }, 30000);
  });

  describe('Directory Encryption and Decryption', () => {
    it('should encrypt and decrypt a directory with multiple files', async () => {
      const testDirPath = path.join(testDir, 'test-folder');
      const password = 'folder-password-789';

      // Create test directory with multiple files
      fs.mkdirSync(testDirPath);
      const file1Content = 'Content of file 1';
      const file2Content =
        'Content of file 2 with more text and special chars: 你好世界';
      const file3Content = crypto.randomBytes(512); // Binary file

      fs.writeFileSync(
        path.join(testDirPath, 'file1.txt'),
        file1Content,
        'utf8',
      );
      fs.writeFileSync(
        path.join(testDirPath, 'file2.txt'),
        file2Content,
        'utf8',
      );
      fs.writeFileSync(path.join(testDirPath, 'file3.bin'), file3Content);

      // Encrypt the directory
      const encryptedFilePath = await encryptFile(testDirPath, password);
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(encryptedFilePath)).toBe(true);
      expect(encryptedFilePath).toMatch(/\.zip\.deadbolt$/);

      // Decrypt the directory (results in a .zip file)
      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(decryptedFilePath)).toBe(true);

      // Verify the decrypted file is a valid zip
      // We can't easily verify the contents without unzipping, but we can check it exists and has content
      const decryptedStats = fs.statSync(decryptedFilePath);
      expect(decryptedStats.size).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should fail to decrypt with wrong password', async () => {
      const originalContent = 'Secret content';
      const testFilePath = path.join(testDir, 'secret.txt');
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';

      // Create and encrypt test file
      fs.writeFileSync(testFilePath, originalContent, 'utf8');
      const encryptedFilePath = await encryptFile(
        testFilePath,
        correctPassword,
      );
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

      // Try to decrypt with wrong password
      const decryptResult = await decryptFile(encryptedFilePath, wrongPassword);

      // Strict error message validation
      expect(decryptResult).toContain(ERROR_MESSAGE_PREFIX);
      expect(decryptResult).toContain('Failed to decrypt');
      expect(decryptResult).toContain('Is the password correct?');
      expect(decryptResult).toContain('The file may also be corrupted');
      expect(decryptResult).toContain(path.basename(encryptedFilePath));

      // Verify exact error format
      const expectedPattern = new RegExp(
        `${ERROR_MESSAGE_PREFIX}: Failed to decrypt \`.*${path.basename(encryptedFilePath)}\`\\nIs the password correct\\? The file may also be corrupted\\.`,
      );
      expect(decryptResult).toMatch(expectedPattern);
    }, 30000);

    it('should handle V001 file with missing metadata (between 61-95 bytes)', async () => {
      const v001TruncatedPath = path.join(testDir, 'v001-truncated.deadbolt');

      // Create a V001-style file (no header) that's >= 61 bytes (passes MIN check)
      // but < 96 bytes (fails LEGACY_METADATA_LEN check for V001)
      const v001TruncatedData = Buffer.alloc(70); // Between 61 and 95
      fs.writeFileSync(v001TruncatedPath, v001TruncatedData);

      // Try to decrypt - should fail with missing metadata error
      const decryptResult = await decryptFile(
        v001TruncatedPath,
        'any-password',
      );

      expect(decryptResult).toContain(ERROR_MESSAGE_PREFIX);
      expect(decryptResult).toContain('is not a valid deadbolt encrypted file');
      expect(decryptResult).toContain(
        "Please ensure you've selected a file encrypted with deadbolt",
      );
      expect(decryptResult).toContain(path.basename(v001TruncatedPath));
    }, 10000);

    it('should handle empty encrypted file (caught by validation)', async () => {
      const emptyFilePath = path.join(testDir, 'empty.deadbolt');
      fs.writeFileSync(emptyFilePath, Buffer.alloc(0));

      const decryptResult = await decryptFile(emptyFilePath, 'any-password');

      expect(decryptResult).toContain(ERROR_MESSAGE_PREFIX);
      expect(decryptResult).toContain('is not a valid deadbolt encrypted file');
      expect(decryptResult).toContain('Please ensure you');
      expect(decryptResult).toContain(path.basename(emptyFilePath));

      const expectedPattern = new RegExp(
        `${ERROR_MESSAGE_PREFIX}: \`.*${path.basename(emptyFilePath)}\` is not a valid deadbolt encrypted file\\.\\nPlease ensure you've selected a file encrypted with deadbolt\\.`,
      );
      expect(decryptResult).toMatch(expectedPattern);
    }, 10000);
  });

  describe('Password Variations', () => {
    it('should handle various password types correctly', async () => {
      const originalContent = 'Test content for password variations';
      const testCases = [
        {
          password: 'P@ssw0rd!#$%',
          description: 'password with special characters',
        },
        { password: '   spaces   ', description: 'password with spaces' },
        { password: '你好世界', description: 'unicode password' },
      ];

      for (const testCase of testCases) {
        const testFilePath = path.join(
          testDir,
          `test-${testCase.description.replace(/\s+/g, '-')}.txt`,
        );
        fs.writeFileSync(testFilePath, originalContent, 'utf8');

        // Encrypt with this password
        const encryptedFilePath = await encryptFile(
          testFilePath,
          testCase.password,
        );
        expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

        // Decrypt with same password
        const decryptedFilePath = await decryptFile(
          encryptedFilePath,
          testCase.password,
        );
        expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

        // Verify content
        const decryptedContent = fs.readFileSync(decryptedFilePath, 'utf8');
        expect(decryptedContent).toBe(originalContent);
      }
    }, 90000); // 90s timeout for 3 password variations (6 total operations)
  });

  describe('Argon2id Key Derivation (V002)', () => {
    it('should use Argon2id for V002 encryption', async () => {
      const testFilePath = path.join(testDir, 'argon2-test.txt');
      const originalContent = 'Test Argon2id KDF';
      fs.writeFileSync(testFilePath, originalContent, 'utf8');

      const encryptedFilePath = await encryptFile(
        testFilePath,
        'test-password',
      );
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

      // Verify file has V002 header
      const encryptedData = fs.readFileSync(encryptedFilePath);
      expect(encryptedData.subarray(0, 13).toString('ascii')).toBe(
        'DEADBOLT_V002',
      );

      // Decrypt and verify
      const decryptedFilePath = await decryptFile(
        encryptedFilePath,
        'test-password',
      );
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

      const decryptedContent = fs.readFileSync(decryptedFilePath, 'utf8');
      expect(decryptedContent).toBe(originalContent);
    }, 30000);
  });
});
