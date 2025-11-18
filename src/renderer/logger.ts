/**
 * Simple logger for renderer process
 * Debug logs are always enabled in the Electron GUI
 */

export const logger = {
  debug: (...args: any[]) => {
    console.log('[DEBUG]', ...args);
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
