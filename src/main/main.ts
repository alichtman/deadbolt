/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { resolveHtmlPath } from './resolveHTMLPathUtil';
import {
  encryptFile,
  decryptFile,
  ERROR_MESSAGE_PREFIX,
} from './encryptionAndDecryptionLib';
import prettyPrintFilePath from './fileUtils';

// TODO: Implement auto-updater
// import { autoUpdater } from 'electron-updater';
// import log from 'electron-log';
// class AppUpdater {
//   constructor() {
//     log.transports.file.level = 'info';
//     autoUpdater.logger = log;
//     autoUpdater.checkForUpdatesAndNotify();
//   }
// }

let mainWindow: BrowserWindow | null = null;

ipcMain.handle('encryptFileRequest', async (_event, [filePath, password]) => {
  console.log(
    'encryptFileRequest',
    '{',
    filePath,
    '} with password of length: ',
    password.length,
  );
  if (!filePath) {
    return `${ERROR_MESSAGE_PREFIX}: No file provided for encryption`;
  }
  // You have no idea how much time I killed trying to debug why throwing here and .catch'ing the promise in the renderer process didn't work.
  const encryptedFilePathOrErrorMessage = await encryptFile(filePath, password);
  console.log(
    'Returning encrypted file path or error message: { ',
    encryptedFilePathOrErrorMessage,
    ' }',
  );
  return encryptedFilePathOrErrorMessage;
});

ipcMain.handle('decryptFileRequest', async (_event, [filePath, password]) => {
  console.log('decryptFileRequest', '{', filePath, '}');
  if (!filePath) {
    return `${ERROR_MESSAGE_PREFIX}: No file provided for decryption`;
  }

  const decryptedFilePathOrErrorMessage = await decryptFile(filePath, password);
  console.log(
    'Returning decrypted file path or error message: { ',
    decryptedFilePathOrErrorMessage,
    ' }',
  );
  return decryptedFilePathOrErrorMessage;
});

ipcMain.handle('prettyPrintFilePath', (_event, [filePath]) => {
  return prettyPrintFilePath(filePath);
});

ipcMain.handle('revealFileInFinder', (_event, [filePath]) => {
  shell.showItemInFolder(filePath);
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const debugSetup = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await debugSetup();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    const assetPath = path.join(RESOURCES_PATH, ...paths);
    return assetPath;
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 750,
    minWidth: 700,
    maxWidth: 700,
    minHeight: 400,
    maxHeight: 400,
    resizable: true, // so it's not actually resizable, but setting this to true makes the window the wrong sizes. idk man
    autoHideMenuBar: true,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // TODO: Implement auto-updater
  // new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
