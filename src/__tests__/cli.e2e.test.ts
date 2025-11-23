/**
 * @jest-environment node
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { encryptFile, decryptFile, ERROR_MESSAGE_PREFIX } from '../main/encryptionAndDecryptionLib';

describe('CLI E2E Tests - Encryption and Decryption', () => {
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
    });

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
    });

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
    });

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
    });
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
    });

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
    });
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
    });

    it('should handle non-existent file gracefully during encryption', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.txt');
      const password = 'test-password';

      // This should be caught by the CLI validation, but testing the library behavior
      // The library expects valid file paths, so this will throw
      await expect(async () => {
        await encryptFile(nonExistentPath, password);
      }).rejects.toThrow();
    });

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
    });
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
    });
  });

  describe('Password Variations', () => {
    it('should handle various password types correctly', async () => {
      const originalContent = 'Test content for password variations';
      const testCases = [
        { password: 'simple', description: 'simple password' },
        { password: 'P@ssw0rd!#$%', description: 'password with special characters' },
        { password: '12345678901234567890', description: 'numeric password' },
        { password: '   spaces   ', description: 'password with spaces' },
        { password: '你好世界', description: 'unicode password' },
        { password: 'a'.repeat(100), description: 'very long password' },
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
    });
  });

  describe('CLI Password Validation', () => {
    const cliPath = path.join(__dirname, '../../dist/deadbolt-cli.js');

    it('should reject password shorter than 8 characters for encrypt command', () => {
      const testFilePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(testFilePath, 'test content', 'utf8');

      let error: any;
      try {
        execSync(`node "${cliPath}" encrypt "${testFilePath}" --password "short"`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toContain('Password must be at least 8 characters');
    });

    it('should reject password shorter than 8 characters for decrypt command', () => {
      const testFilePath = path.join(testDir, 'test.txt');
      const password = 'valid-password';

      // First create an encrypted file with a valid password
      fs.writeFileSync(testFilePath, 'test content', 'utf8');
      execSync(`node "${cliPath}" encrypt "${testFilePath}" --password "${password}"`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const encryptedFilePath = testFilePath + '.deadbolt';
      expect(fs.existsSync(encryptedFilePath)).toBe(true);

      // Now try to decrypt with a short password
      let error: any;
      try {
        execSync(`node "${cliPath}" decrypt "${encryptedFilePath}" --password "short"`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toContain('Password must be at least 8 characters');
    });

    it('should accept password with exactly 8 characters', () => {
      const testFilePath = path.join(testDir, 'test.txt');
      const password = '12345678'; // Exactly 8 characters

      fs.writeFileSync(testFilePath, 'test content', 'utf8');

      let error: any;
      try {
        execSync(`node "${cliPath}" encrypt "${testFilePath}" --password "${password}"`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (err) {
        error = err;
      }

      // Should succeed (no error thrown)
      expect(error).toBeUndefined();

      const encryptedFilePath = testFilePath + '.deadbolt';
      expect(fs.existsSync(encryptedFilePath)).toBe(true);
    });

    it('should accept password longer than 8 characters', () => {
      const testFilePath = path.join(testDir, 'test.txt');
      const password = 'this-is-a-long-password';

      fs.writeFileSync(testFilePath, 'test content', 'utf8');

      let error: any;
      try {
        execSync(`node "${cliPath}" encrypt "${testFilePath}" --password "${password}"`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (err) {
        error = err;
      }

      // Should succeed (no error thrown)
      expect(error).toBeUndefined();

      const encryptedFilePath = testFilePath + '.deadbolt';
      expect(fs.existsSync(encryptedFilePath)).toBe(true);
    });
  });
});
