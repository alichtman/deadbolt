/**
 * @jest-environment node
 *
 * E2E tests for backwards compatibility with V001 and V002 file formats.
 * Tests actual CLI execution to ensure both legacy and current formats work.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import crypto from 'crypto';

describe('Format Version Backwards Compatibility - CLI E2E', () => {
  const cliPath = path.join(__dirname, '../../dist/deadbolt-cli.js');
  const password = 'testing123!';
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadbolt-format-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('V001 Legacy Format Decryption', () => {
    it('should display V001 warning when decrypting V001 files', () => {
      // Copy V001 encrypted test file to temp directory
      const v001EncryptedSource = path.join(
        __dirname,
        'test_data/deadbolt_v001/Demo.deadboltv1.jpg.deadbolt',
      );
      const v001EncryptedCopy = path.join(testDir, 'Demo-warning-test.jpg.deadbolt');

      fs.copyFileSync(v001EncryptedSource, v001EncryptedCopy);

      // Decrypt using CLI and capture output
      const stdout = execSync(
        `node "${cliPath}" decrypt "${v001EncryptedCopy}" --password "${password}"`,
        { encoding: 'utf8', cwd: testDir },
      );

      // Verify V001 warning is displayed
      expect(stdout).toContain('Legacy V001 Format Detected');
      expect(stdout).toContain('consider re-encrypting this file');
      expect(stdout).toContain('PBKDF2');
      expect(stdout).toContain('Argon2id');
    }, 30000);

    it('should decrypt V001 encrypted files using CLI', () => {
      // Copy V001 encrypted test file to temp directory
      const v001EncryptedSource = path.join(
        __dirname,
        'test_data/deadbolt_v001/Demo.deadboltv1.jpg.deadbolt',
      );
      const v001Original = path.join(
        __dirname,
        'test_data/deadbolt_v001/Demo.jpg',
      );
      const v001EncryptedCopy = path.join(testDir, 'Demo-v001.jpg.deadbolt');

      fs.copyFileSync(v001EncryptedSource, v001EncryptedCopy);

      // Verify V001 file does NOT have version header
      const v001Content = fs.readFileSync(v001EncryptedCopy);
      const v001Header = v001Content.subarray(0, 13).toString('ascii');
      expect(v001Header).not.toContain('DEADBOLT_V');

      // Decrypt using CLI
      const stdout = execSync(
        `node "${cliPath}" decrypt "${v001EncryptedCopy}" --password "${password}"`,
        { encoding: 'utf8', cwd: testDir },
      );

      expect(stdout).toContain('Successfully decrypted');

      // Verify decrypted file exists
      const decryptedPath = path.join(testDir, 'Demo-v001.jpg');
      expect(fs.existsSync(decryptedPath)).toBe(true);

      // Verify decrypted content matches original by comparing SHA256 hashes
      const originalContent = fs.readFileSync(v001Original);
      const decryptedContent = fs.readFileSync(decryptedPath);
      const originalHash = crypto
        .createHash('sha256')
        .update(originalContent)
        .digest('hex');
      const decryptedHash = crypto
        .createHash('sha256')
        .update(decryptedContent)
        .digest('hex');
      expect(decryptedHash).toBe(originalHash);
    }, 30000);

    it('should fail to decrypt V001 files with wrong password via CLI', () => {
      const v001EncryptedSource = path.join(
        __dirname,
        'test_data/deadbolt_v001/Demo.deadboltv1.jpg.deadbolt',
      );
      const v001EncryptedCopy = path.join(
        testDir,
        'Demo-wrong-pw.jpg.deadbolt',
      );

      fs.copyFileSync(v001EncryptedSource, v001EncryptedCopy);

      // Try to decrypt with wrong password
      let error: any;
      try {
        execSync(
          `node "${cliPath}" decrypt "${v001EncryptedCopy}" --password "wrong-password"`,
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
  });

  describe('V002 Current Format Encryption and Decryption', () => {
    it('should encrypt files with V002 format (with version header) and decrypt via CLI', () => {
      const originalFile = path.join(testDir, 'test-v002.txt');
      const originalContent = 'This is a V002 test file';
      fs.writeFileSync(originalFile, originalContent, 'utf8');

      // Encrypt using CLI (should create V002 format)
      const encryptStdout = execSync(
        `node "${cliPath}" encrypt "${originalFile}" --password "${password}"`,
        { encoding: 'utf8', cwd: testDir },
      );

      expect(encryptStdout).toContain('Successfully encrypted');

      const encryptedPath = path.join(testDir, 'test-v002.txt.deadbolt');
      expect(fs.existsSync(encryptedPath)).toBe(true);

      // Verify V002 file HAS version header
      const encryptedContent = fs.readFileSync(encryptedPath);
      const header = encryptedContent.subarray(0, 13).toString('ascii');
      expect(header).toBe('DEADBOLT_V002');

      // Decrypt using CLI
      const decryptStdout = execSync(
        `node "${cliPath}" decrypt "${encryptedPath}" --password "${password}"`,
        { encoding: 'utf8', cwd: testDir },
      );

      expect(decryptStdout).toContain('Successfully decrypted');

      // Verify decrypted content matches original by comparing SHA256 hashes
      const decryptedPath = path.join(testDir, 'test-v002.txt');
      expect(fs.existsSync(decryptedPath)).toBe(true);
      const decryptedContent = fs.readFileSync(decryptedPath);
      const originalHash = crypto
        .createHash('sha256')
        .update(originalContent)
        .digest('hex');
      const decryptedHash = crypto
        .createHash('sha256')
        .update(decryptedContent)
        .digest('hex');
      expect(decryptedHash).toBe(originalHash);
    }, 30000); // 30s timeout (Argon2id is much faster than PBKDF2 1M)

    it('should decrypt V002 files if test data has V002 format', () => {
      const v002EncryptedSource = path.join(
        __dirname,
        'test_data/deadbolt_v002/Demo.deadboltv2.jpg.deadbolt',
      );
      const v002Original = path.join(
        __dirname,
        'test_data/deadbolt_v002/Demo.jpg',
      );
      const v002EncryptedCopy = path.join(testDir, 'Demo-v002.jpg.deadbolt');

      fs.copyFileSync(v002EncryptedSource, v002EncryptedCopy);

      // Verify V002 file HAS version header
      const v002Content = fs.readFileSync(v002EncryptedCopy);
      const v002Header = v002Content.subarray(0, 13).toString('ascii');
      expect(v002Header).toBe('DEADBOLT_V002');

      // Decrypt using CLI
      const stdout = execSync(
        `node "${cliPath}" decrypt "${v002EncryptedCopy}" --password "${password}"`,
        { encoding: 'utf8', cwd: testDir },
      );

      expect(stdout).toContain('Successfully decrypted');

      // Verify decrypted file matches original by comparing SHA256 hashes
      const decryptedPath = path.join(testDir, 'Demo-v002.jpg');
      expect(fs.existsSync(decryptedPath)).toBe(true);

      const originalContent = fs.readFileSync(v002Original);
      const decryptedContent = fs.readFileSync(decryptedPath);
      const originalHash = crypto
        .createHash('sha256')
        .update(originalContent)
        .digest('hex');
      const decryptedHash = crypto
        .createHash('sha256')
        .update(decryptedContent)
        .digest('hex');
      expect(decryptedHash).toBe(originalHash);
    }, 30000); // 30s timeout (Argon2id is much faster than PBKDF2 1M)
  });
});
