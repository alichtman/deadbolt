#!/usr/bin/env node

import { Command } from 'commander';
import prompts from 'prompts';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import log from '../main/logger';
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
  .addHelpText(
    'after',
    `
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
`,
  );

/**
 * Validates that a file exists
 */
function validateFileExists(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    log.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }
  return absolutePath;
}

/**
 * Validates that a file is an encrypted file (has .deadbolt or .dbolt extension)
 */
function validateEncryptedFile(filePath: string): void {
  if (
    !filePath.endsWith(ENCRYPTED_FILE_EXTENSION) &&
    !filePath.endsWith(LEGACY_ENCRYPTED_FILE_EXTENSION)
  ) {
    log.error(`Error: File is not an encrypted file`);
    log.error(
      `Expected file extension: ${ENCRYPTED_FILE_EXTENSION} or ${LEGACY_ENCRYPTED_FILE_EXTENSION}`,
    );
    log.error(`Received: ${path.basename(filePath)}`);
    process.exit(1);
  }
}

/**
 * Validates that a directory exists (for output path)
 */
function validateOutputPath(
  outputPath: string | undefined,
): string | undefined {
  if (!outputPath) {
    return undefined;
  }

  const absolutePath = path.resolve(outputPath);
  const dir = path.dirname(absolutePath);

  if (!fs.existsSync(dir)) {
    log.error(`Error: Output directory does not exist: ${dir}`);
    process.exit(1);
  }

  return absolutePath;
}

/**
 * Handles the result from encryption/decryption operations
 */
function handleResult(
  result: string,
  operation: 'Encryption' | 'Decryption',
): void {
  if (result.startsWith(ERROR_MESSAGE_PREFIX)) {
    const errorMessage = result.substring(ERROR_MESSAGE_PREFIX.length + 1);
    log.error(`\n${operation} failed:`);
    log.error(errorMessage);
    process.exit(1);
  } else {
    // Success message is already emitted in encryptFile/decryptFile functions, so we skip it here
    // log.success(`${operation} successful: ${result}`);
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
    log.warn(`Warning: Failed to move file to output path: ${error}`);
    log.warn(`File is available at: ${sourcePath}`);
    return sourcePath;
  }
}

/**
 * Validates password meets minimum requirements
 */
function validatePassword(password: string): boolean {
  if (password.length < 8) {
    log.error('Error: Password must be at least 8 characters');
    return false;
  }
  return true;
}

/**
 * Gets password either from command-line options or by prompting the user.
 * Validates password if provided via options, exits on validation failure.
 */
async function getPassword(
  providedPassword: string | undefined,
  confirmPassword: boolean,
): Promise<string> {
  if (providedPassword) {
    if (!validatePassword(providedPassword)) {
      process.exit(1);
    }
    return providedPassword;
  }

  return (await promptForPassword(confirmPassword))!;
}

/**
 * Prompts for password (and confirmation for encryption)
 */
async function promptForPassword(
  confirmPassword: boolean = false,
): Promise<string | undefined> {
  let password: string | undefined;

  // Loop until we get a valid password
  while (!password) {
    const passwordResponse = await prompts(
      {
        type: 'password',
        name: 'password',
        message: 'Enter password:  ',
      },
      {
        onCancel: () => {
          log.warn('\nOperation cancelled.');
          process.exit(0);
        },
      },
    );

    // Check if user cancelled
    if (!passwordResponse.password) {
      log.warn('\nOperation cancelled.');
      process.exit(0);
    }

    // Validate password length
    if (passwordResponse.password.length < 8) {
      log.error('Password must be at least 8 characters\n');
      continue;
    }

    password = passwordResponse.password;
  }

  // If confirmation is required, prompt for it
  if (confirmPassword) {
    while (true) {
      const confirmResponse = await prompts(
        {
          type: 'password',
          name: 'confirmPassword',
          message: 'Confirm password:',
        },
        {
          onCancel: () => {
            log.warn('\nOperation cancelled.');
            process.exit(0);
          },
        },
      );

      // Check if user cancelled
      if (!confirmResponse.confirmPassword) {
        log.warn('\nOperation cancelled.');
        process.exit(0);
      }

      // Validate passwords match
      if (confirmResponse.confirmPassword !== password) {
        log.error('Passwords do not match\n');
        continue;
      }

      break;
    }
  }

  return password;
}

/**
 * Command-line encrypt mode
 */
program
  .command('encrypt [file]')
  .description('Encrypt a file or folder using AES-256-GCM')
  .option('-f, --file <path>', 'Path to the file or folder to encrypt')
  .option(
    '-p, --password <password>',
    'Password for encryption (will prompt if not provided)',
  )
  .option(
    '-o, --output <path>',
    'Output file (optional, defaults to <file>.deadbolt)',
  )
  .addHelpText(
    'after',
    `
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
`,
  )
  .action(async (fileArg, options) => {
    // Use positional argument if provided, otherwise fall back to --file flag
    const filePath = fileArg || options.file;

    if (!filePath) {
      log.error('Error: file or directory path is required');
      log.error('Usage: deadbolt encrypt <file> [options]');
      log.error('   or: deadbolt encrypt --file <file> [options]');
      process.exit(1);
    }

    const absoluteFilePath = validateFileExists(filePath);
    const outputPath = validateOutputPath(options.output);

    // Get and validate password
    const password = await getPassword(options.password, true);

    log.info('Encrypting...');
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
  .option(
    '-p, --password <password>',
    'Password for decryption (will prompt if not provided)',
  )
  .option(
    '-o, --output <path>',
    'Output file (optional, defaults to original filename)',
  )
  .addHelpText(
    'after',
    `
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
`,
  )
  .action(async (fileArg, options) => {
    // Use positional argument if provided, otherwise fall back to --file flag
    const filePath = fileArg || options.file;

    if (!filePath) {
      log.error('Error: file path is required');
      log.error('Usage: deadbolt decrypt <file> [options]');
      log.error('   or: deadbolt decrypt --file <file> [options]');
      process.exit(1);
    }

    const absoluteFilePath = validateFileExists(filePath);
    validateEncryptedFile(absoluteFilePath);
    const outputPath = validateOutputPath(options.output);

    // Check if this is a V001 file and warn the user before decryption
    try {
      const fileContent = fs.readFileSync(absoluteFilePath);
      const header = fileContent.subarray(0, 13).toString('ascii');
      const isV001File = !header.startsWith('DEADBOLT_V');

      if (isV001File) {
        console.log(chalk.yellow('\n⚠️  Legacy V001 Format Detected'));
        console.log(
          chalk.yellow('For better security, consider re-encrypting this file.'),
        );
        console.log(
          chalk.yellow(
            'V001 uses PBKDF2 (10K iterations). V002 uses Argon2id with 2 GiB memory, 1 iteration, and 4-lane parallelism (RFC 9106 FIRST recommendation), making password cracking significantly more expensive for GPU/ASIC attackers.\n',
          ),
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log.debug(`Could not check file format version: ${message}`);
    }

    // Get and validate password
    const password = await getPassword(options.password, false);

    log.info('Decrypting...');
    const result = await decryptFile(absoluteFilePath, password);

    let finalPath = result;
    if (outputPath && !result.startsWith(ERROR_MESSAGE_PREFIX)) {
      finalPath = moveToOutputPath(result, outputPath);
    }

    handleResult(finalPath, 'Decryption');
  });

program.parse();
