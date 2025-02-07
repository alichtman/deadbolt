/* eslint-disable no-console */
import fs from 'fs';
import { homedir } from 'os';
import path from 'path';

export const ENCRYPTED_FILE_EXTENSION = '.deadbolt';
export const LEGACY_ENCRYPTED_FILE_EXTENSION = '.dbolt';

export default function prettyPrintFilePath(
  filePath: string | undefined,
): string {
  if (filePath == null) {
    console.log('filePath is null. something is fucked');
    return '';
  }
  console.log('prettyPrintFilePath', '{', filePath, '}');
  // Create a local variable instead of modifying the parameter
  let prettyPath = filePath;

  if (prettyPath.startsWith(homedir())) {
    prettyPath = prettyPath.replace(homedir(), '~');
  }

  // If path is too long, truncate it. Make sure homedir is collapsed to ~, the first and last directories are shown, and the middle is truncated.
  // Min window width is 400px, and 60 characters fits well in it.
  if (prettyPath.length > 60) {
    const pathParts = prettyPath.split(path.sep);
    const firstDir = prettyPath.startsWith('~/')
      ? `~${path.sep}${pathParts[1]}`
      : pathParts[1];
    const lastDir = pathParts[pathParts.length - 1];
    const ellipsis = '...';
    const truncatedPath = `${firstDir}${path.sep}${ellipsis}${path.sep}${lastDir}`;
    return truncatedPath;
  }
  return prettyPath;
}

/** ********
 * Utilities
 ********** */

/**
 * Replace last instance of search in input with replacement
 * @param {String} input Input string
 * @param {String} search Substring to search for
 * @param {String} replacement Substring to replace with
 */
function replaceLast(
  input: string,
  search: string,
  replacement: string,
): string {
  // Find last occurrence
  const index = input.lastIndexOf(search);
  if (index === -1) {
    return input;
  }
  // Replace occurrence
  return (
    input.substring(0, index) +
    replacement +
    input.substring(index + search.length)
  );
}

/**
 * Replace last instance of any supported encrypted file extension
 * @param {String} input Input string
 * @returns {String} Input with last extension removed
 */
function removeEncryptedFileExtension(input: string): string {
  if (input.endsWith(ENCRYPTED_FILE_EXTENSION)) {
    return replaceLast(input, ENCRYPTED_FILE_EXTENSION, '');
  }
  if (input.endsWith(LEGACY_ENCRYPTED_FILE_EXTENSION)) {
    return replaceLast(input, LEGACY_ENCRYPTED_FILE_EXTENSION, '');
  }
  return input;
}

/**
 * Writes the decrypted file to the same directory as the encrypted file. Encrypted files are suffixed with .dbolt, so we remove that suffix.
 * If the file already exists, we append -NUMBER to the end of the filename, where NUMBER is the lowest number that doesn't conflict with an existing file.
 *
 * Example:
 * - If the encrypted file is /path/to/file.txt.dbolt, the decrypted file will be /path/to/file.txt
 * - If the decrypted file already exists, we will try /path/to/file-1.txt, /path/to/file-2.txt, etc.
 * @param encryptedFilePath
 * @returns
 */
export function generateValidDecryptedFilePath(encryptedFilePath: string) {
  const baseFilePathWithOriginalExtension =
    removeEncryptedFileExtension(encryptedFilePath);

  // Split the path into name and extension
  const lastDotIndex = baseFilePathWithOriginalExtension.lastIndexOf('.');
  // This handles files with no extension
  const nameWithoutExt =
    lastDotIndex !== -1
      ? baseFilePathWithOriginalExtension.slice(0, lastDotIndex)
      : baseFilePathWithOriginalExtension;
  const extension =
    lastDotIndex !== -1
      ? baseFilePathWithOriginalExtension.slice(lastDotIndex)
      : '';

  let candidateFilePath = baseFilePathWithOriginalExtension;
  let counter = 1;

  while (fs.existsSync(candidateFilePath)) {
    candidateFilePath = `${nameWithoutExt}-${counter}${extension}`;
    counter += 1;
  }

  return candidateFilePath;
}

/**
 * Generates a valid zip file path by appending .zip extension.
 * If the file already exists, appends -NUMBER to the end of the filename, where NUMBER is the lowest number that doesn't conflict with an existing file.
 *
 * Example:
 * - If the original file is /path/to/folder, the zip will be /path/to/folder.zip
 * - If that exists, it will try /path/to/folder-1.zip, /path/to/folder-2.zip, etc.
 *
 * @param originalPath - The path to the folder/file that will be zipped
 * @returns The path where the zip file should be written
 */
export function generateValidZipFilePath(originalPath: string): string {
  const baseZipPath = `${originalPath}.zip`;
  let candidateZipPath = baseZipPath;
  let counter = 1;

  while (fs.existsSync(candidateZipPath)) {
    candidateZipPath = `${originalPath}-${counter}.zip`;
    counter += 1;
  }

  return candidateZipPath;
}


/**
 * Generates a valid encrypted file path by appending the encrypted file extension.
 * If the file already exists, appends -NUMBER to the end of the filename, where NUMBER is the lowest number that doesn't conflict with an existing file.
 *
 * Example for files with extensions:
 * - If the original file is /path/to/file.txt, the encrypted file will be /path/to/file.txt.dbolt
 * - If the encrypted file already exists, it will try /path/to/file-1.txt.dbolt, /path/to/file-2.txt.dbolt, etc.
 *
 * Example for files without extensions:
 * - If the original file is /path/to/README, the encrypted file will be /path/to/README.dbolt
 * - If the encrypted file already exists, it will try /path/to/README-1.dbolt, /path/to/README-2.dbolt, etc.
 *
 * @param originalFilePath - The path to the file that will be encrypted
 * @returns The path where the encrypted file should be written
 */
export function generateValidEncryptedFilePath(
  originalFilePath: string,
): string {
  const baseFilePath = `${originalFilePath}${ENCRYPTED_FILE_EXTENSION}`;
  const lastPeriodIndex = originalFilePath.lastIndexOf('.');

  // Handle files with no extension
  if (lastPeriodIndex === -1) {
    let candidateFilePath = baseFilePath;
    let counter = 1;

    while (fs.existsSync(candidateFilePath)) {
      candidateFilePath = `${originalFilePath}-${counter}${ENCRYPTED_FILE_EXTENSION}`;
      counter += 1;
    }
    return candidateFilePath;
  }

  const originalFileExtension = originalFilePath.substring(lastPeriodIndex);
  const baseFilePathWithoutExtension = originalFilePath.substring(
    0,
    lastPeriodIndex,
  );
  let candidateFilePath = baseFilePath;
  let counter = 1;

  while (fs.existsSync(candidateFilePath)) {
    candidateFilePath = `${baseFilePathWithoutExtension}-${counter}${originalFileExtension}${ENCRYPTED_FILE_EXTENSION}`;
    counter += 1;
  }

  return candidateFilePath;
}
