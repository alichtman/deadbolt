export const ENCRYPTED_FILE_EXTENSION = '.deadbolt';
export const LEGACY_ENCRYPTED_FILE_EXTENSION = '.dbolt';

// This is sync'd from src/main/encryptionAndDecryptionLib.ts, but we can't actually import the value here, so we redefine it.
// This follows the DRYUYRHT (Don't Repeat Yourself Unless You Really Have To) principle.
const ERROR_MESSAGE_PREFIX = 'ERROR_FROM_ELECTRON_MAIN_THREAD';

/**
 * Checks if the given file path corresponds to a Deadbolt file.
 *
 * @param filePath - The path of the file to check. Can be a string or null.
 * @returns `true` if the file path ends with the Deadbolt file extension, otherwise `false`.
 */
export function isDeadboltFile(filePath: string | undefined): boolean {
  if (!filePath || filePath.startsWith(ERROR_MESSAGE_PREFIX)) {
    return false;
  }

  return (
    filePath.endsWith(ENCRYPTED_FILE_EXTENSION) ||
    filePath.endsWith(LEGACY_ENCRYPTED_FILE_EXTENSION)
  );
}
