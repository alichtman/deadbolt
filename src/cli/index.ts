#!/usr/bin/env node

import { Command } from 'commander';
import prompts from 'prompts';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import {
  encryptFile,
  decryptFile,
  ERROR_MESSAGE_PREFIX,
} from '../main/encryptionAndDecryptionLib';
import {
  ENCRYPTED_FILE_EXTENSION,
  LEGACY_ENCRYPTED_FILE_EXTENSION,
} from '../main/fileUtils';

const program = new Command();

program
  .name('deadbolt')
  .description('Encrypt and decrypt files using AES-256-GCM encryption')
  .version('2.0.2')
  .option('-v, --verbose', 'Enable verbose logging (debug mode)')
  .addHelpText('after', `
Examples:
  $ deadbolt encrypt secret.pdf
  $ deadbolt encrypt secret.pdf --password "my-password"
  $ deadbolt decrypt secret.pdf.deadbolt
  $ deadbolt decrypt secret.pdf.deadbolt --password "my-password"
  $ deadbolt encrypt secret.pdf --verbose

Password Prompting:
  If --password is not provided, you will be prompted to enter it securely.
  Using --password directly may log your password in shell history.

Verbose Mode:
  Use --verbose or -v to enable debug logging for troubleshooting.

Documentation:
  https://github.com/alichtman/deadbolt
`);

/**
 * Validates that a file exists
 */
function validateFileExists(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(chalk.red(`Error: File not found: ${absolutePath}`));
    process.exit(1);
  }
  return absolutePath;
}

/**
 * Validates that a file is an encrypted file (has .deadbolt or .dbolt extension)
 */
function validateEncryptedFile(filePath: string): void {
  if (!filePath.endsWith(ENCRYPTED_FILE_EXTENSION) && !filePath.endsWith(LEGACY_ENCRYPTED_FILE_EXTENSION)) {
    console.error(chalk.red(`Error: File is not an encrypted file`));
    console.error(chalk.red(`Expected file extension: ${ENCRYPTED_FILE_EXTENSION} or ${LEGACY_ENCRYPTED_FILE_EXTENSION}`));
    console.error(chalk.red(`Received: ${path.basename(filePath)}`));
    process.exit(1);
  }
}

/**
 * Validates that a directory exists (for output path)
 */
function validateOutputPath(outputPath: string | undefined): string | undefined {
  if (!outputPath) {
    return undefined;
  }

  const absolutePath = path.resolve(outputPath);
  const dir = path.dirname(absolutePath);

  if (!fs.existsSync(dir)) {
    console.error(chalk.red(`Error: Output directory does not exist: ${dir}`));
    process.exit(1);
  }

  return absolutePath;
}

/**
 * Handles the result from encryption/decryption operations
 */
function handleResult(result: string, operation: 'Encryption' | 'Decryption'): void {
  if (result.startsWith(ERROR_MESSAGE_PREFIX)) {
    const errorMessage = result.substring(ERROR_MESSAGE_PREFIX.length + 1);
    console.error(chalk.red(`\n${operation} failed:`));
    console.error(chalk.red(errorMessage));
    process.exit(1);
  } else {
    console.log(chalk.green(`${operation} successful: ${result}`));
  }
}

/**
 * Moves a file to a specified output path
 * Returns the final path (outputPath if successful, sourcePath if failed)
 */
function moveToOutputPath(sourcePath: string, outputPath: string): string {
  try {
    fs.renameSync(sourcePath, outputPath);
    return outputPath;
  } catch (error) {
    console.error(chalk.yellow(`Warning: Failed to move file to output path: ${error}`));
    console.error(chalk.yellow(`File is available at: ${sourcePath}`));
    return sourcePath;
  }
}

/**
 * Prompts for password (and confirmation for encryption)
 */
async function promptForPassword(confirmPassword: boolean = false): Promise<string | undefined> {
  // First, get the password
  const passwordResponse = await prompts({
    type: 'password',
    name: 'password',
    message: 'Enter password:',
    validate: (value: string) => value.length > 0 || 'Password cannot be empty',
  });

  // Check if user cancelled
  if (!passwordResponse.password) {
    console.log(chalk.yellow('\nOperation cancelled.'));
    process.exit(0);
  }

  // If confirmation is required, prompt for it
  if (confirmPassword) {
    const confirmResponse = await prompts({
      type: 'password',
      name: 'confirmPassword',
      message: 'Confirm password:',
      validate: (value: string) =>
        value === passwordResponse.password || 'Passwords do not match',
    });

    // Check if user cancelled
    if (!confirmResponse.confirmPassword) {
      console.log(chalk.yellow('\nOperation cancelled.'));
      process.exit(0);
    }
  }

  return passwordResponse.password;
}

/**
 * Command-line encrypt mode
 */
program
  .command('encrypt [file]')
  .description('Encrypt a file or folder using AES-256-GCM')
  .option('-f, --file <path>', 'Path to the file or folder to encrypt')
  .option('-p, --password <password>', 'Password for encryption (will prompt if not provided)')
  .option('-o, --output <path>', 'Output file (optional, defaults to <file>.deadbolt)')
  .addHelpText('after', `
Examples:
  $ deadbolt encrypt secret.pdf
  $ deadbolt encrypt secret.pdf --password "secure-password"
  $ deadbolt encrypt ~/folder --password "pass123"
  $ deadbolt encrypt data.txt --output encrypted.deadbolt
  $ deadbolt encrypt --file secret.pdf  (alternative syntax)

Notes:
  - Folders are automatically zipped before encryption
  - Password will be prompted securely if not provided via --password
  - Using --password directly may log your password in shell history
  - Encrypted files have .deadbolt extension
  - Use strong passwords for better security
`)
  .action(async (fileArg, options) => {
    // Use positional argument if provided, otherwise fall back to --file flag
    const filePath = fileArg || options.file;

    if (!filePath) {
      console.error(chalk.red('Error: file or directory path is required'));
      console.error(chalk.red('Usage: deadbolt encrypt <file> [options]'));
      console.error(chalk.red('   or: deadbolt encrypt --file <file> [options]'));
      process.exit(1);
    }

    const absoluteFilePath = validateFileExists(filePath);
    const outputPath = validateOutputPath(options.output);

    // Prompt for password if not provided
    const password = options.password || await promptForPassword(true);

    console.log(chalk.cyan('Encrypting...'));
    const result = await encryptFile(absoluteFilePath, password);

    let finalPath = result;
    if (outputPath && !result.startsWith(ERROR_MESSAGE_PREFIX)) {
      finalPath = moveToOutputPath(result, outputPath);
    }

    handleResult(finalPath, 'Encryption');
  });

/**
 * Command-line decrypt mode
 */
program
  .command('decrypt [file]')
  .description('Decrypt a .deadbolt or .dbolt file')
  .option('-f, --file <path>', 'Path to the encrypted file')
  .option('-p, --password <password>', 'Password for decryption (will prompt if not provided)')
  .option('-o, --output <path>', 'Output file (optional, defaults to original filename)')
  .addHelpText('after', `
Examples:
  $ deadbolt decrypt secret.pdf.deadbolt
  $ deadbolt decrypt secret.pdf.deadbolt --password "secure-password"
  $ deadbolt decrypt encrypted.deadbolt --password "pass123"
  $ deadbolt decrypt data.deadbolt --output decrypted.txt
  $ deadbolt decrypt --file secret.pdf.deadbolt  (alternative syntax)

Notes:
  - Works with both .deadbolt and .dbolt files
  - Password will be prompted securely if not provided via --password
  - Using --password directly may log your password in shell history
  - Password must match the one used for encryption
  - Decrypted folders will be .zip files (unzip manually)
`)
  .action(async (fileArg, options) => {
    // Use positional argument if provided, otherwise fall back to --file flag
    const filePath = fileArg || options.file;

    if (!filePath) {
      console.error(chalk.red('Error: file path is required'));
      console.error(chalk.red('Usage: deadbolt decrypt <file> [options]'));
      console.error(chalk.red('   or: deadbolt decrypt --file <file> [options]'));
      process.exit(1);
    }

    const absoluteFilePath = validateFileExists(filePath);
    validateEncryptedFile(absoluteFilePath);
    const outputPath = validateOutputPath(options.output);

    // Prompt for password if not provided
    const password = options.password || await promptForPassword(false);

    console.log(chalk.cyan('Decrypting...'));
    const result = await decryptFile(absoluteFilePath, password);

    let finalPath = result;
    if (outputPath && !result.startsWith(ERROR_MESSAGE_PREFIX)) {
      finalPath = moveToOutputPath(result, outputPath);
    }

    handleResult(finalPath, 'Decryption');
  });

program.parse();
