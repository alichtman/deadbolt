/**
 * @jest-environment node
 *
 * Unit tests for the encryption and decryption library functions.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { encryptFile, decryptFile, ERROR_MESSAGE_PREFIX } from '../main/encryptionAndDecryptionLib';

describe('Encryption Library Tests', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temporary directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadbolt-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory after each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('File Encryption and Decryption', () => {
    it('should encrypt and decrypt a text file, resulting in identical content', async () => {
      const originalContent = 'This is a test file for deadbolt CLI encryption.\nIt has multiple lines.\nAnd special characters: !@#$%^&*()';
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

    it('should encrypt and decrypt a large file (5MB), resulting in identical content', async () => {
      // Create a 5MB file
      const originalContent = crypto.randomBytes(5 * 1024 * 1024); // 5MB
      const testFilePath = path.join(testDir, 'large-file.bin');
      const password = 'large-file-password';

      // Create test large file
      fs.writeFileSync(testFilePath, originalContent);

      // Encrypt the file
      const encryptedFilePath = await encryptFile(testFilePath, password);
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(encryptedFilePath)).toBe(true);

      // Decrypt the file
      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(decryptedFilePath)).toBe(true);

      // Verify decrypted content matches original
      const decryptedContent = fs.readFileSync(decryptedFilePath);
      expect(Buffer.compare(decryptedContent, originalContent)).toBe(0);
    }, 30000); // 30 second timeout for large file test

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

    it('should handle files with special characters in the name', async () => {
      const originalContent = 'File with special name';
      const testFilePath = path.join(testDir, 'test-file (with) [special] {chars}.txt');
      const password = 'special-chars-password';

      // Create test file
      fs.writeFileSync(testFilePath, originalContent, 'utf8');

      // Encrypt the file
      const encryptedFilePath = await encryptFile(testFilePath, password);
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(encryptedFilePath)).toBe(true);

      // Decrypt the file
      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(decryptedFilePath)).toBe(true);

      // Verify decrypted content matches original
      const decryptedContent = fs.readFileSync(decryptedFilePath, 'utf8');
      expect(decryptedContent).toBe(originalContent);
    }, 30000);
  });

  describe('Directory Encryption and Decryption', () => {
    it('should encrypt and decrypt a directory with multiple files', async () => {
      const testDirPath = path.join(testDir, 'test-folder');
      const password = 'folder-password-789';

      // Create test directory with multiple files
      fs.mkdirSync(testDirPath);
      const file1Content = 'Content of file 1';
      const file2Content = 'Content of file 2 with more text and special chars: 你好世界';
      const file3Content = crypto.randomBytes(512); // Binary file

      fs.writeFileSync(path.join(testDirPath, 'file1.txt'), file1Content, 'utf8');
      fs.writeFileSync(path.join(testDirPath, 'file2.txt'), file2Content, 'utf8');
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

    it('should encrypt and decrypt a nested directory structure', async () => {
      const testDirPath = path.join(testDir, 'nested-folder');
      const password = 'nested-folder-password';

      // Create nested directory structure
      fs.mkdirSync(testDirPath);
      fs.mkdirSync(path.join(testDirPath, 'subdir1'));
      fs.mkdirSync(path.join(testDirPath, 'subdir2'));

      fs.writeFileSync(path.join(testDirPath, 'root.txt'), 'Root file', 'utf8');
      fs.writeFileSync(path.join(testDirPath, 'subdir1', 'sub1.txt'), 'Subdir 1 file', 'utf8');
      fs.writeFileSync(path.join(testDirPath, 'subdir2', 'sub2.txt'), 'Subdir 2 file', 'utf8');

      // Encrypt the directory
      const encryptedFilePath = await encryptFile(testDirPath, password);
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(encryptedFilePath)).toBe(true);

      // Decrypt the directory
      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(decryptedFilePath)).toBe(true);

      // Verify the decrypted file exists and has content
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
      const encryptedFilePath = await encryptFile(testFilePath, correctPassword);
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

      // Try to decrypt with wrong password
      const decryptResult = await decryptFile(encryptedFilePath, wrongPassword);
      expect(decryptResult).toContain(ERROR_MESSAGE_PREFIX);
      expect(decryptResult.toLowerCase()).toContain('password');
    }, 30000);

    it('should handle non-existent file gracefully during encryption', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.txt');
      const password = 'test-password';

      // This should be caught by the CLI validation, but testing the library behavior
      // The library expects valid file paths, so this will throw
      await expect(async () => {
        await encryptFile(nonExistentPath, password);
      }).rejects.toThrow();
    }, 10000);

    it('should handle corrupted encrypted file', async () => {
      const originalContent = 'Original content';
      const testFilePath = path.join(testDir, 'original.txt');
      const password = 'test-password';

      // Create and encrypt test file
      fs.writeFileSync(testFilePath, originalContent, 'utf8');
      const encryptedFilePath = await encryptFile(testFilePath, password);
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

      // Corrupt the encrypted file by modifying bytes
      const encryptedData = fs.readFileSync(encryptedFilePath);
      const corruptedData = Buffer.from(encryptedData);
      // Corrupt a byte in the payload (after the 96-byte metadata header)
      if (corruptedData.length > 100) {
        corruptedData[100] = corruptedData[100] ^ 0xFF; // Flip bits
      }
      fs.writeFileSync(encryptedFilePath, corruptedData);

      // Try to decrypt corrupted file
      const decryptResult = await decryptFile(encryptedFilePath, password);
      expect(decryptResult).toContain(ERROR_MESSAGE_PREFIX);
    }, 30000);
  });

  describe('Multiple Encrypt/Decrypt Cycles', () => {
    it('should maintain data integrity through multiple encrypt/decrypt cycles', async () => {
      const originalContent = 'Content that will be encrypted and decrypted multiple times';
      let currentFilePath = path.join(testDir, 'cycle-test.txt');
      const password = 'cycle-password';

      // Create initial file
      fs.writeFileSync(currentFilePath, originalContent, 'utf8');

      // Perform 3 encrypt/decrypt cycles
      for (let i = 0; i < 3; i++) {
        // Encrypt
        const encryptedFilePath = await encryptFile(currentFilePath, password);
        expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

        // Decrypt
        const decryptedFilePath = await decryptFile(encryptedFilePath, password);
        expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

        // Verify content still matches
        const content = fs.readFileSync(decryptedFilePath, 'utf8');
        expect(content).toBe(originalContent);

        // Use decrypted file for next cycle
        currentFilePath = decryptedFilePath;
      }
    }, 90000); // 90s timeout for 3 encrypt/decrypt cycles (6 total operations)
  });

  describe('Password Variations', () => {
    it('should handle various password types correctly', async () => {
      const originalContent = 'Test content for password variations';
      const testCases = [
        { password: 'P@ssw0rd!#$%', description: 'password with special characters' },
        { password: '   spaces   ', description: 'password with spaces' },
        { password: '你好世界', description: 'unicode password' },
      ];

      for (const testCase of testCases) {
        const testFilePath = path.join(testDir, `test-${testCase.description.replace(/\s+/g, '-')}.txt`);
        fs.writeFileSync(testFilePath, originalContent, 'utf8');

        // Encrypt with this password
        const encryptedFilePath = await encryptFile(testFilePath, testCase.password);
        expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

        // Decrypt with same password
        const decryptedFilePath = await decryptFile(encryptedFilePath, testCase.password);
        expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

        // Verify content
        const decryptedContent = fs.readFileSync(decryptedFilePath, 'utf8');
        expect(decryptedContent).toBe(originalContent);
      }
    }, 90000); // 90s timeout for 3 password variations (6 total operations)
  });
});
