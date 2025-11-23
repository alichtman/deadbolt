/**
 * @jest-environment node
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { encryptFile, decryptFile, ERROR_MESSAGE_PREFIX } from '../main/encryptionAndDecryptionLib';

/**
 * Helper function to create a V001 (legacy) encrypted file
 * This is necessary for testing backwards compatibility since encryptFile() only creates V002 files
 * Format: salt(64) + IV(16) + authTag(16) + ciphertext (NO VERSION HEADER)
 * Uses 10,000 PBKDF2 iterations
 */
function createV001LegacyFile(
  outputPath: string,
  content: Buffer | string,
  password: string,
): void {
  const plaintext = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  const salt = crypto.randomBytes(64);
  const derivedKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha512');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // V001 format: NO version header, just metadata + ciphertext
  fs.writeFileSync(outputPath, Buffer.concat([salt, iv, authTag, ciphertext]));
}

describe('Format Version Backwards Compatibility', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadbolt-version-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('V001 Legacy Format (Backwards Compatibility)', () => {
    it('should decrypt V001 files with 10,000 iterations and no version header', async () => {
      const plaintext = 'This is a V001 legacy encrypted file';
      const password = 'legacy-password-123';
      const encryptedFilePath = path.join(testDir, 'legacy-v001.deadbolt');

      // Create V001 format file (must use helper since encryptFile() only creates V002)
      createV001LegacyFile(encryptedFilePath, plaintext, password);

      // Verify file does NOT start with version header
      const fileContent = fs.readFileSync(encryptedFilePath);
      expect(fileContent.subarray(0, 10).toString('ascii')).not.toContain('DEADBOLT_V');

      // Decrypt using the real decryptFile function
      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

      // Verify content matches
      const decryptedContent = fs.readFileSync(decryptedFilePath, 'utf8');
      expect(decryptedContent).toBe(plaintext);
    });

    it('should decrypt V001 files with .dbolt extension', async () => {
      const plaintext = 'Legacy .dbolt file format';
      const password = 'dbolt-password';
      const encryptedFilePath = path.join(testDir, 'legacy-file.dbolt');

      createV001LegacyFile(encryptedFilePath, plaintext, password);

      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.readFileSync(decryptedFilePath, 'utf8')).toBe(plaintext);
    });

    it('should fail to decrypt V001 files with wrong password', async () => {
      const plaintext = 'Secret V001 content';
      const correctPassword = 'correct-v001-password';
      const wrongPassword = 'wrong-v001-password';
      const encryptedFilePath = path.join(testDir, 'v001-wrong-password.deadbolt');

      createV001LegacyFile(encryptedFilePath, plaintext, correctPassword);

      const decryptResult = await decryptFile(encryptedFilePath, wrongPassword);
      expect(decryptResult).toContain(ERROR_MESSAGE_PREFIX);
      expect(decryptResult.toLowerCase()).toContain('password');
    });

    it('should decrypt V001 files with binary content', async () => {
      const binaryData = crypto.randomBytes(512);
      const password = 'binary-v001-password';
      const encryptedFilePath = path.join(testDir, 'v001-binary.deadbolt');

      createV001LegacyFile(encryptedFilePath, binaryData, password);

      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(Buffer.compare(fs.readFileSync(decryptedFilePath), binaryData)).toBe(0);
    });
  });

  describe('V002 Current Format', () => {
    it('should encrypt and decrypt with V002 format (1M iterations, version header)', async () => {
      const plaintext = 'This is a V002 encrypted file with version header';
      const password = 'v002-password-456';
      const originalFilePath = path.join(testDir, 'v002-original.txt');

      // Create test file
      fs.writeFileSync(originalFilePath, plaintext, 'utf8');

      // Encrypt using real encryptFile function (creates V002)
      const encryptedFilePath = await encryptFile(originalFilePath, password);
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(fs.existsSync(encryptedFilePath)).toBe(true);

      // Verify file DOES start with DEADBOLT_V002 header
      const fileContent = fs.readFileSync(encryptedFilePath);
      expect(fileContent.subarray(0, 13).toString('ascii')).toBe('DEADBOLT_V002');

      // Decrypt using real decryptFile function
      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

      // Verify decrypted content matches original
      expect(fs.readFileSync(decryptedFilePath, 'utf8')).toBe(plaintext);
    }, 30000);

    it('should fail to decrypt V002 files with wrong password', async () => {
      const plaintext = 'Secret V002 content';
      const correctPassword = 'correct-v002-password';
      const wrongPassword = 'wrong-v002-password';
      const originalFilePath = path.join(testDir, 'v002-secret.txt');

      fs.writeFileSync(originalFilePath, plaintext, 'utf8');
      const encryptedFilePath = await encryptFile(originalFilePath, correctPassword);

      // Try to decrypt with wrong password
      const decryptResult = await decryptFile(encryptedFilePath, wrongPassword);
      expect(decryptResult).toContain(ERROR_MESSAGE_PREFIX);
      expect(decryptResult.toLowerCase()).toContain('password');
    });

    it('should encrypt and decrypt V002 files with binary content', async () => {
      const binaryData = crypto.randomBytes(1024);
      const password = 'binary-v002-password';
      const originalFilePath = path.join(testDir, 'v002-binary.bin');

      fs.writeFileSync(originalFilePath, binaryData);

      const encryptedFilePath = await encryptFile(originalFilePath, password);
      expect(encryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

      const decryptedFilePath = await decryptFile(encryptedFilePath, password);
      expect(decryptedFilePath).not.toContain(ERROR_MESSAGE_PREFIX);

      expect(Buffer.compare(fs.readFileSync(decryptedFilePath), binaryData)).toBe(0);
    }, 30000);
  });

  describe('Cross-Version Compatibility', () => {
    it('should correctly decrypt both V001 and V002 files with same password', async () => {
      const plaintext = 'Same content, different formats';
      const password = 'shared-password';

      // Create V001 file (legacy helper)
      const v001Path = path.join(testDir, 'cross-v001.deadbolt');
      createV001LegacyFile(v001Path, plaintext, password);

      // Create V002 file (real encryptFile)
      const v002OriginalPath = path.join(testDir, 'cross-v002-original.txt');
      fs.writeFileSync(v002OriginalPath, plaintext, 'utf8');
      const v002Path = await encryptFile(v002OriginalPath, password);

      // Decrypt both and verify identical content
      const v001DecryptedPath = await decryptFile(v001Path, password);
      const v002DecryptedPath = await decryptFile(v002Path, password);

      expect(v001DecryptedPath).not.toContain(ERROR_MESSAGE_PREFIX);
      expect(v002DecryptedPath).not.toContain(ERROR_MESSAGE_PREFIX);

      const v001Content = fs.readFileSync(v001DecryptedPath, 'utf8');
      const v002Content = fs.readFileSync(v002DecryptedPath, 'utf8');

      expect(v001Content).toBe(plaintext);
      expect(v002Content).toBe(plaintext);
      expect(v001Content).toBe(v002Content);
    }, 30000);

    it('should have different file sizes due to version header', async () => {
      const plaintext = 'Size comparison test';
      const password = 'size-password';

      const v001Path = path.join(testDir, 'size-v001.deadbolt');
      createV001LegacyFile(v001Path, plaintext, password);

      const v002OriginalPath = path.join(testDir, 'size-v002-original.txt');
      fs.writeFileSync(v002OriginalPath, plaintext, 'utf8');
      const v002Path = await encryptFile(v002OriginalPath, password);

      // V002 should be 13 bytes larger (version header)
      const v001Size = fs.statSync(v001Path).size;
      const v002Size = fs.statSync(v002Path).size;
      expect(v002Size - v001Size).toBe(13);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should reject invalid version numbers in header', async () => {
      const invalidVersionPath = path.join(testDir, 'invalid-version.deadbolt');

      // Create file with invalid version
      const fakeData = Buffer.concat([
        Buffer.from('DEADBOLT_V999', 'ascii'),
        crypto.randomBytes(100),
      ]);
      fs.writeFileSync(invalidVersionPath, fakeData);

      const decryptResult = await decryptFile(invalidVersionPath, 'password');
      expect(decryptResult).toContain(ERROR_MESSAGE_PREFIX);
    });

    it('should reject files too small to be valid', async () => {
      const tooSmallPath = path.join(testDir, 'too-small.deadbolt');
      fs.writeFileSync(tooSmallPath, crypto.randomBytes(50)); // < 96 bytes

      const decryptResult = await decryptFile(tooSmallPath, 'password');
      expect(decryptResult).toContain(ERROR_MESSAGE_PREFIX);
    });
  });
});
