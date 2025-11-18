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
  $ deadbolt encrypt --file document.pdf --password "my-password"
  $ deadbolt decrypt --file document.pdf.deadbolt --password "my-password"
  $ deadbolt encrypt    (interactive mode)
  $ deadbolt decrypt    (interactive mode)

Interactive Mode:
  Run 'deadbolt encrypt' or 'deadbolt decrypt' without options to launch
  interactive mode with prompts for file, password, and output path.

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
 * Interactive encrypt mode
 */
async function interactiveEncrypt(): Promise<void> {
  console.log('\n🔐 Deadbolt - Interactive Encryption Mode\n');

  const response = await prompts([
    {
      type: 'text',
      name: 'filePath',
      message: 'Enter the path to the file or folder to encrypt:',
      validate: (value: string) => {
        const absolutePath = path.resolve(value);
        return fs.existsSync(absolutePath) || 'File or folder does not exist';
      },
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter password:',
      validate: (value: string) => value.length > 0 || 'Password cannot be empty',
    },
    {
      type: 'password',
      name: 'confirmPassword',
      message: 'Confirm password:',
      validate: (value: string, prev: any) =>
        value === prev.password || 'Passwords do not match',
    },
    {
      type: 'text',
      name: 'outputPath',
      message: 'Enter output path (press Enter for default):',
      initial: '',
    },
  ]);

  // Check if user cancelled
  if (!response.filePath || !response.password) {
    console.log('\nOperation cancelled.');
    process.exit(0);
  }

  const absoluteFilePath = path.resolve(response.filePath);
  const outputPath = response.outputPath
    ? validateOutputPath(response.outputPath)
    : undefined;

  console.log('\nEncrypting...');
  const result = await encryptFile(absoluteFilePath, response.password);

  if (outputPath && !result.startsWith(ERROR_MESSAGE_PREFIX)) {
    moveToOutputPath(result, outputPath);
  }

  handleResult(result, 'Encryption');
}

/**
 * Interactive decrypt mode
 */
async function interactiveDecrypt(): Promise<void> {
  console.log('\n🔓 Deadbolt - Interactive Decryption Mode\n');

  const response = await prompts([
    {
      type: 'text',
      name: 'filePath',
      message: 'Enter the path to the encrypted file:',
      validate: (value: string) => {
        const absolutePath = path.resolve(value);
        if (!fs.existsSync(absolutePath)) {
          return 'File does not exist';
        }
        if (!absolutePath.endsWith('.deadbolt') && !absolutePath.endsWith('.dbolt')) {
          return 'File must have .deadbolt or .dbolt extension';
        }
        return true;
      },
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter password:',
      validate: (value: string) => value.length > 0 || 'Password cannot be empty',
    },
    {
      type: 'text',
      name: 'outputPath',
      message: 'Enter output path (press Enter for default):',
      initial: '',
    },
  ]);

  // Check if user cancelled
  if (!response.filePath || !response.password) {
    console.log('\nOperation cancelled.');
    process.exit(0);
  }

  const absoluteFilePath = path.resolve(response.filePath);
  const outputPath = response.outputPath
    ? validateOutputPath(response.outputPath)
    : undefined;

  console.log('\nDecrypting...');
  const result = await decryptFile(absoluteFilePath, response.password);

  if (outputPath && !result.startsWith(ERROR_MESSAGE_PREFIX)) {
    moveToOutputPath(result, outputPath);
  }

  handleResult(result, 'Decryption');
}

/**
 * Command-line encrypt mode
 */
program
  .command('encrypt')
  .description('Encrypt a file or folder using AES-256-GCM')
  .option('-f, --file <path>', 'Path to the file or folder to encrypt')
  .option('-p, --password <password>', 'Password for encryption')
  .option('-o, --output <path>', 'Output file (optional, defaults to <file>.deadbolt)')
  .addHelpText('after', `
Examples:
  $ deadbolt encrypt --file document.pdf --password "secure-password"
  $ deadbolt encrypt --file ~/folder --password "pass123"
  $ deadbolt encrypt --file data.txt --password "pass" --output encrypted.deadbolt
  $ deadbolt encrypt    (launches interactive mode)

Notes:
  - Folders are automatically zipped before encryption
  - Run without options for interactive mode with password confirmation
  - Encrypted files have .deadbolt extension
  - Use strong passwords for better security
`)
  .action(async (options) => {
    // If no options provided, run interactive mode
    if (!options.file && !options.password) {
      await interactiveEncrypt();
      return;
    }

    // Validate required options
    if (!options.file) {
      console.error('Error: --file is required');
      process.exit(1);
    }
    if (!options.password) {
      console.error('Error: --password is required');
      process.exit(1);
    }

    const absoluteFilePath = validateFileExists(options.file);
    const outputPath = validateOutputPath(options.output);

    console.log('Encrypting...');
    const result = await encryptFile(absoluteFilePath, options.password);

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
  .option('-f, --file <path>', 'Path to the encrypted file')
  .option('-p, --password <password>', 'Password for decryption')
  .option('-o, --output <path>', 'Output file (optional, defaults to original filename)')
  .addHelpText('after', `
Examples:
  $ deadbolt decrypt --file document.pdf.deadbolt --password "secure-password"
  $ deadbolt decrypt --file encrypted.deadbolt --password "pass123"
  $ deadbolt decrypt --file data.deadbolt --password "pass" --output decrypted.txt
  $ deadbolt decrypt    (launches interactive mode)

Notes:
  - Works with both .deadbolt and .dbolt files
  - Run without options for interactive mode
  - Password must match the one used for encryption
  - Decrypted folders will be .zip files (unzip manually)
`)
  .action(async (options) => {
    // If no options provided, run interactive mode
    if (!options.file && !options.password) {
      await interactiveDecrypt();
      return;
    }

    // Validate required options
    if (!options.file) {
      console.error('Error: --file is required');
      process.exit(1);
    }
    if (!options.password) {
      console.error('Error: --password is required');
      process.exit(1);
    }

    const absoluteFilePath = validateFileExists(options.file);
    const outputPath = validateOutputPath(options.output);

    console.log('Decrypting...');
    const result = await decryptFile(absoluteFilePath, options.password);

    if (outputPath && !result.startsWith(ERROR_MESSAGE_PREFIX)) {
      moveToOutputPath(result, outputPath);
    }

    handleResult(result, 'Decryption');
  });

program.parse();
