import chalk from 'chalk';

/**
 * Configures and exports the logger for the main process and CLI.
 * In production, logs are written to:
 * - on Linux: ~/.config/{app name}/logs/main.log
 * - on macOS: ~/Library/Logs/{app name}/main.log
 * - on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\main.log
 */

// Check if running in Electron context
const isElectron = typeof process !== 'undefined' &&
                   process.versions &&
                   'electron' in process.versions;

/**
 * Formats a timestamp
 * Format: [YYYY-MM-DD HH:MM:SS]
 */
function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;
}

/**
 * Color map for different log levels
 */
const levelColors: Record<string, (text: string) => string> = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.cyan,
  success: chalk.green,
  debug: chalk.gray,
};

/**
 * Creates a formatted and colorized log function
 */
function createFormattedLogger(level: string, consoleMethod: (...args: any[]) => void) {
  const colorFn = levelColors[level] || chalk.white;
  return (...args: any[]) => {
    const timestamp = formatTimestamp();
    const levelLabel = `[${level}]`;
    consoleMethod(colorFn(`${timestamp} ${levelLabel}`), ...args);
  };
}

/**
 * Creates a simple colorized log function without timestamps or labels (for CLI)
 */
function createSimpleLogger(level: string, consoleMethod: (...args: any[]) => void) {
  const colorFn = levelColors[level] || chalk.white;
  return (...args: any[]) => {
    // Join all args into a single string and colorize it
    const message = args.join(' ');
    consoleMethod(colorFn(message));
  };
}

let log: any;

if (isElectron) {
  // Use electron-log for Electron app
  const electronLog = require('electron-log');

  // Configure log level based on environment
  if (process.env.NODE_ENV === 'development') {
    electronLog.transports.console.level = 'info';
    electronLog.transports.file.level = 'info';
  } else {
    electronLog.transports.console.level = 'warn';
    electronLog.transports.file.level = 'info';
  }

  // Use default electron-log formatting (it handles colors automatically)
  electronLog.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
  electronLog.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';

  // Add success method since electron-log doesn't have it by default
  electronLog.success = (...args: any[]) => {
    electronLog.info('[SUCCESS]', ...args);
  };

  log = electronLog;
} else {
  // Use simple colorized console logger for CLI (no timestamps or labels)
  log = {
    error: createSimpleLogger('error', console.error),
    warn: createSimpleLogger('warn', console.warn),
    info: createSimpleLogger('info', console.log),
    success: createSimpleLogger('success', console.log),
    debug: createSimpleLogger('debug', console.log),
  };
}

export default log;
