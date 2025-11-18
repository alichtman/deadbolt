/**
 * Simple logger for CLI
 * Debug logs are output when:
 * - DEBUG environment variable is set, OR
 * - --verbose (-v) flag is passed to the CLI
 */

const isVerboseMode =
  process.env.DEBUG === 'true' ||
  process.env.DEBUG === '1' ||
  process.argv.includes('--verbose') ||
  process.argv.includes('-v');

export const logger = {
  debug: (...args: any[]) => {
    if (isVerboseMode) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};
