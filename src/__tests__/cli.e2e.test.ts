/**
 * @jest-environment node
 *
 * E2E tests for the Deadbolt CLI.
 * Tests actual CLI execution via execSync.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';

describe('CLI E2E Tests', () => {
  const cliPath = path.join(__dirname, '../../dist/deadbolt-cli.js');
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadbolt-cli-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Basic Encryption and Decryption', () => {
    it('should encrypt and decrypt a text file via CLI', () => {
      const originalContent =
        'This is a test file for CLI encryption.\nMultiple lines.\nSpecial chars: !@#$%^&*()';
      const testFilePath = path.join(testDir, 'test.txt');
      const password = 'test-password-123';

      fs.writeFileSync(testFilePath, originalContent, 'utf8');

      // Encrypt via CLI
      const encryptStdout = execSync(
        `node "${cliPath}" encrypt "${testFilePath}" --password "${password}"`,
        { encoding: 'utf8', cwd: testDir },
      );

      expect(encryptStdout).toContain('Successfully encrypted');

      const encryptedPath = testFilePath + '.deadbolt';
      expect(fs.existsSync(encryptedPath)).toBe(true);

      // Decrypt via CLI
      const decryptStdout = execSync(
        `node "${cliPath}" decrypt "${encryptedPath}" --password "${password}"`,
        { encoding: 'utf8', cwd: testDir },
      );

      expect(decryptStdout).toContain('Successfully decrypted');

      // Verify decrypted content matches original
      expect(fs.existsSync(testFilePath)).toBe(true);
      const decryptedContent = fs.readFileSync(testFilePath, 'utf8');
      expect(decryptedContent).toBe(originalContent);
    }, 30000);

    it('should encrypt and decrypt a binary file via CLI', () => {
      const originalContent = crypto.randomBytes(1024);
      const testFilePath = path.join(testDir, 'test.bin');
      const password = 'binary-password-456';

      fs.writeFileSync(testFilePath, originalContent);

      // Encrypt via CLI
      execSync(
        `node "${cliPath}" encrypt "${testFilePath}" --password "${password}"`,
        { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
      );

      const encryptedPath = testFilePath + '.deadbolt';
      expect(fs.existsSync(encryptedPath)).toBe(true);

      // Decrypt via CLI
      execSync(
        `node "${cliPath}" decrypt "${encryptedPath}" --password "${password}"`,
        { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
      );

      // Verify decrypted binary content matches original
      expect(fs.existsSync(testFilePath)).toBe(true);
      const decryptedContent = fs.readFileSync(testFilePath);
      expect(Buffer.compare(decryptedContent, originalContent)).toBe(0);
    }, 30000);

    it('should encrypt and decrypt an empty file via CLI', () => {
      const testFilePath = path.join(testDir, 'empty.txt');
      const password = 'empty-password';

      fs.writeFileSync(testFilePath, '');

      // Encrypt via CLI
      execSync(
        `node "${cliPath}" encrypt "${testFilePath}" --password "${password}"`,
        { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
      );

      const encryptedPath = testFilePath + '.deadbolt';
      expect(fs.existsSync(encryptedPath)).toBe(true);

      // Decrypt via CLI
      execSync(
        `node "${cliPath}" decrypt "${encryptedPath}" --password "${password}"`,
        { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
      );

      // Verify decrypted content is still empty
      expect(fs.existsSync(testFilePath)).toBe(true);
      const decryptedContent = fs.readFileSync(testFilePath, 'utf8');
      expect(decryptedContent).toBe('');
    }, 30000);
  });

  describe('Directory Encryption and Decryption', () => {
    it('should encrypt and decrypt a directory via CLI', () => {
      const testDirPath = path.join(testDir, 'test-folder');
      const password = 'folder-password-789';

      // Create test directory with multiple files
      fs.mkdirSync(testDirPath);
      fs.writeFileSync(
        path.join(testDirPath, 'file1.txt'),
        'Content 1',
        'utf8',
      );
      fs.writeFileSync(
        path.join(testDirPath, 'file2.txt'),
        'Content 2',
        'utf8',
      );

      // Encrypt via CLI
      const encryptStdout = execSync(
        `node "${cliPath}" encrypt "${testDirPath}" --password "${password}"`,
        { encoding: 'utf8', cwd: testDir },
      );

      expect(encryptStdout).toContain('Successfully encrypted');

      const encryptedPath = testDirPath + '.zip.deadbolt';
      expect(fs.existsSync(encryptedPath)).toBe(true);

      // Decrypt via CLI
      const decryptStdout = execSync(
        `node "${cliPath}" decrypt "${encryptedPath}" --password "${password}"`,
        { encoding: 'utf8', cwd: testDir },
      );

      expect(decryptStdout).toContain('Successfully decrypted');

      // Verify decrypted zip file exists
      const decryptedZipPath = testDirPath + '.zip';
      expect(fs.existsSync(decryptedZipPath)).toBe(true);
      const stats = fs.statSync(decryptedZipPath);
      expect(stats.size).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should fail to decrypt with wrong password via CLI', () => {
      const testFilePath = path.join(testDir, 'secret.txt');
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password-123';

      fs.writeFileSync(testFilePath, 'Secret content', 'utf8');

      // Encrypt with correct password
      execSync(
        `node "${cliPath}" encrypt "${testFilePath}" --password "${correctPassword}"`,
        { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
      );

      const encryptedPath = testFilePath + '.deadbolt';
      expect(fs.existsSync(encryptedPath)).toBe(true);

      // Try to decrypt with wrong password
      let error: any;
      try {
        execSync(
          `node "${cliPath}" decrypt "${encryptedPath}" --password "${wrongPassword}"`,
          { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
        );
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.status).not.toBe(0);
      const output = error.stderr?.toString() || error.stdout?.toString() || '';
      expect(output.toLowerCase()).toMatch(/password|decrypt|fail/);
    }, 30000);

    it('should handle non-existent file gracefully via CLI', () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.txt');
      const password = 'test-password';

      let error: any;
      try {
        execSync(
          `node "${cliPath}" encrypt "${nonExistentPath}" --password "${password}"`,
          { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
        );
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.status).not.toBe(0);
    }, 10000);
  });

  describe('Password Validation', () => {
    it('should reject password shorter than 8 characters for encrypt command', () => {
      const testFilePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(testFilePath, 'test content', 'utf8');

      let error: any;
      try {
        execSync(
          `node "${cliPath}" encrypt "${testFilePath}" --password "short"`,
          {
            encoding: 'utf8',
            stdio: 'pipe',
          },
        );
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toContain(
        'Password must be at least 8 characters',
      );
    }, 10000);

    it('should reject password shorter than 8 characters for decrypt command', () => {
      const testFilePath = path.join(testDir, 'test.txt');
      const password = 'valid-password';

      // First create an encrypted file with a valid password
      fs.writeFileSync(testFilePath, 'test content', 'utf8');
      execSync(
        `node "${cliPath}" encrypt "${testFilePath}" --password "${password}"`,
        {
          encoding: 'utf8',
          stdio: 'pipe',
        },
      );

      const encryptedFilePath = testFilePath + '.deadbolt';
      expect(fs.existsSync(encryptedFilePath)).toBe(true);

      // Now try to decrypt with a short password
      let error: any;
      try {
        execSync(
          `node "${cliPath}" decrypt "${encryptedFilePath}" --password "short"`,
          {
            encoding: 'utf8',
            stdio: 'pipe',
          },
        );
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toContain(
        'Password must be at least 8 characters',
      );
    }, 30000);

    it('should accept password with exactly 8 characters', () => {
      const testFilePath = path.join(testDir, 'test.txt');
      const password = '12345678'; // Exactly 8 characters

      fs.writeFileSync(testFilePath, 'test content', 'utf8');

      let error: any;
      try {
        execSync(
          `node "${cliPath}" encrypt "${testFilePath}" --password "${password}"`,
          {
            encoding: 'utf8',
            stdio: 'pipe',
          },
        );
      } catch (err) {
        error = err;
      }

      // Should succeed (no error thrown)
      expect(error).toBeUndefined();

      const encryptedFilePath = testFilePath + '.deadbolt';
      expect(fs.existsSync(encryptedFilePath)).toBe(true);
    }, 20000);

    it('should accept password longer than 8 characters', () => {
      const testFilePath = path.join(testDir, 'test.txt');
      const password = 'this-is-a-long-password';

      fs.writeFileSync(testFilePath, 'test content', 'utf8');

      let error: any;
      try {
        execSync(
          `node "${cliPath}" encrypt "${testFilePath}" --password "${password}"`,
          {
            encoding: 'utf8',
            stdio: 'pipe',
          },
        );
      } catch (err) {
        error = err;
      }

      // Should succeed (no error thrown)
      expect(error).toBeUndefined();

      const encryptedFilePath = testFilePath + '.deadbolt';
      expect(fs.existsSync(encryptedFilePath)).toBe(true);
    }, 20000);
  });

  describe('Special Cases', () => {
    it('should handle files with special characters in the name via CLI', () => {
      const originalContent = 'File with special name';
      const testFilePath = path.join(
        testDir,
        'test-file (with) [special] {chars}.txt',
      );
      const password = 'special-chars-password';

      fs.writeFileSync(testFilePath, originalContent, 'utf8');

      // Encrypt via CLI
      execSync(
        `node "${cliPath}" encrypt "${testFilePath}" --password "${password}"`,
        { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
      );

      const encryptedPath = testFilePath + '.deadbolt';
      expect(fs.existsSync(encryptedPath)).toBe(true);

      // Decrypt via CLI
      execSync(
        `node "${cliPath}" decrypt "${encryptedPath}" --password "${password}"`,
        { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
      );

      // Verify decrypted content matches original
      expect(fs.existsSync(testFilePath)).toBe(true);
      const decryptedContent = fs.readFileSync(testFilePath, 'utf8');
      expect(decryptedContent).toBe(originalContent);
    }, 30000);

    it('should handle various password types via CLI', () => {
      const testCases = [
        { password: 'simple12', description: 'simple' },
        { password: 'P@ssw0rd!#$%', description: 'special-chars' },
        { password: '12345678', description: 'numeric' },
        { password: '   spaces   ', description: 'spaces' },
      ];

      for (const testCase of testCases) {
        const testFilePath = path.join(
          testDir,
          `test-${testCase.description}.txt`,
        );
        fs.writeFileSync(testFilePath, 'content', 'utf8');

        // Encrypt
        execSync(
          `node "${cliPath}" encrypt "${testFilePath}" --password "${testCase.password}"`,
          { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
        );

        const encryptedPath = testFilePath + '.deadbolt';
        expect(fs.existsSync(encryptedPath)).toBe(true);

        // Decrypt
        execSync(
          `node "${cliPath}" decrypt "${encryptedPath}" --password "${testCase.password}"`,
          { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
        );

        expect(fs.existsSync(testFilePath)).toBe(true);
      }
    }, 90000); // 90s timeout for multiple password variations (4 encrypt/decrypt cycles)
  });

  describe('Error Handling', () => {
    it('should show helpful error when unable to write encrypted file', () => {
      // Create a file in a directory that will be made read-only
      const unwritableDir = path.join(testDir, 'unwritable_folder');
      fs.mkdirSync(unwritableDir);

      const testFilePath = path.join(
        unwritableDir,
        'this_file_will_fail_to_be_encrypted.txt',
      );
      fs.writeFileSync(testFilePath, 'File content\n', 'utf8');

      // Make the directory read-only (prevent writing new files)
      fs.chmodSync(unwritableDir, 0o555); // r-xr-xr-x

      let error: any;
      try {
        execSync(
          `node "${cliPath}" encrypt "${testFilePath}" --password "test123456"`,
          { encoding: 'utf8', stdio: 'pipe', cwd: testDir },
        );
      } catch (err) {
        error = err;
      } finally {
        // Restore permissions for cleanup
        fs.chmodSync(unwritableDir, 0o755);
      }

      expect(error).toBeDefined();
      expect(error.status).not.toBe(0);

      const output = error.stderr?.toString() || error.stdout?.toString() || '';

      // Verify error message is helpful
      expect(output.toLowerCase()).toMatch(/failed to be written/);
      expect(output).toContain('encrypt'); // Should mention what operation failed
    }, 30000);
  });
});
