import log from 'electron-log';

/**
 * Configures and exports the logger for the main process.
 * In production, logs are written to:
 * - on Linux: ~/.config/{app name}/logs/main.log
 * - on macOS: ~/Library/Logs/{app name}/main.log
 * - on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\main.log
 */

// Configure log level based on environment
if (process.env.NODE_ENV === 'development') {
  log.transports.console.level = 'debug';
  log.transports.file.level = 'debug';
} else {
  log.transports.console.level = 'warn';
  log.transports.file.level = 'info';
}

// Format log messages
log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';

export default log;
