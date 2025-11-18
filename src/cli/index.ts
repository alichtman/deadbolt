#!/usr/bin/env node

import { Command } from 'commander';
import prompts from 'prompts';
import path from 'path';
import fs from 'fs';
import {
  encryptFile,
  decryptFile,
  ERROR_MESSAGE_PREFIX,
} from '../main/encryptionAndDecryptionLib';

const program = new Command();

program
  .name('deadbolt')
  .description('Encrypt and decrypt files using AES-256-GCM encryption')
  .version('2.0.2')
  .addHelpText('after', `
Examples:
  $ deadbolt encrypt --file document.pdf
  $ deadbolt encrypt --file document.pdf --password "my-password"
  $ deadbolt decrypt --file document.pdf.deadbolt
  $ deadbolt decrypt --file document.pdf.deadbolt --password "my-password"

Password Prompting:
  If --password is not provided, you will be prompted to enter it securely.
  This keeps passwords out of your shell history.

Documentation:
  https://github.com/alichtman/deadbolt
`);

/**
 * Validates that a file exists
 */
function validateFileExists(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }
  return absolutePath;
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
    console.error(`Error: Output directory does not exist: ${dir}`);
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
    console.error(`\n${operation} failed:`);
    console.error(errorMessage);
    process.exit(1);
  } else {
    console.log(`\n${operation} successful!`);
    console.log(`Output: ${result}`);
  }
}

/**
 * Moves a file to a specified output path
 */
function moveToOutputPath(sourcePath: string, outputPath: string): void {
  try {
    fs.renameSync(sourcePath, outputPath);
    console.log(`Moved to: ${outputPath}`);
  } catch (error) {
    console.error(`Warning: Failed to move file to output path: ${error}`);
    console.error(`File is available at: ${sourcePath}`);
  }
}

/**
 * Prompts for password (and confirmation for encryption)
 */
async function promptForPassword(confirmPassword: boolean = false): Promise<string | undefined> {
  const questions: prompts.PromptObject[] = [
    {
      type: 'password',
      name: 'password',
      message: 'Enter password:',
      validate: (value: string) => value.length > 0 || 'Password cannot be empty',
    },
  ];

  if (confirmPassword) {
    questions.push({
      type: 'password',
      name: 'confirmPassword',
      message: 'Confirm password:',
      validate: (value: string, prev: any) =>
        value === prev.password || 'Passwords do not match',
    });
  }

  const response = await prompts(questions);

  // Check if user cancelled
  if (!response.password) {
    console.log('\nOperation cancelled.');
    process.exit(0);
  }

  return response.password;
}

/**
 * Command-line encrypt mode
 */
program
  .command('encrypt')
  .description('Encrypt a file or folder using AES-256-GCM')
  .requiredOption('-f, --file <path>', 'Path to the file or folder to encrypt')
  .option('-p, --password <password>', 'Password for encryption (will prompt if not provided)')
  .option('-o, --output <path>', 'Output file (optional, defaults to <file>.deadbolt)')
  .addHelpText('after', `
Examples:
  $ deadbolt encrypt --file document.pdf
  $ deadbolt encrypt --file document.pdf --password "secure-password"
  $ deadbolt encrypt --file ~/folder --password "pass123"
  $ deadbolt encrypt --file data.txt --output encrypted.deadbolt

Notes:
  - Folders are automatically zipped before encryption
  - Password will be prompted securely if not provided via --password
  - Encrypted files have .deadbolt extension
  - Use strong passwords for better security
`)
  .action(async (options) => {
    const absoluteFilePath = validateFileExists(options.file);
    const outputPath = validateOutputPath(options.output);

    // Prompt for password if not provided
    const password = options.password || await promptForPassword(true);

    console.log('Encrypting...');
    const result = await encryptFile(absoluteFilePath, password);

    if (outputPath && !result.startsWith(ERROR_MESSAGE_PREFIX)) {
      moveToOutputPath(result, outputPath);
    }

    handleResult(result, 'Encryption');
  });

/**
 * Command-line decrypt mode
 */
program
  .command('decrypt')
  .description('Decrypt a .deadbolt or .dbolt file')
  .requiredOption('-f, --file <path>', 'Path to the encrypted file')
  .option('-p, --password <password>', 'Password for decryption (will prompt if not provided)')
  .option('-o, --output <path>', 'Output file (optional, defaults to original filename)')
  .addHelpText('after', `
Examples:
  $ deadbolt decrypt --file document.pdf.deadbolt
  $ deadbolt decrypt --file document.pdf.deadbolt --password "secure-password"
  $ deadbolt decrypt --file encrypted.deadbolt --password "pass123"
  $ deadbolt decrypt --file data.deadbolt --output decrypted.txt

Notes:
  - Works with both .deadbolt and .dbolt files
  - Password will be prompted securely if not provided via --password
  - Password must match the one used for encryption
  - Decrypted folders will be .zip files (unzip manually)
`)
  .action(async (options) => {
    const absoluteFilePath = validateFileExists(options.file);
    const outputPath = validateOutputPath(options.output);

    // Prompt for password if not provided
    const password = options.password || await promptForPassword(false);

    console.log('Decrypting...');
    const result = await decryptFile(absoluteFilePath, password);

    if (outputPath && !result.startsWith(ERROR_MESSAGE_PREFIX)) {
      moveToOutputPath(result, outputPath);
    }

    handleResult(result, 'Decryption');
  });

program.parse();
