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
import { homedir } from 'os';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { resolveHtmlPath } from './util';
import { encryptFile, decryptFile } from './encryptionAndDecryptionLib';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.handle('encryptFileRequest', async (_event, [filePath, password]) => {
  console.log(
    'encryptFileRequest',
    '{',
    filePath,
    '} with password of length: ',
    password.length,
  );
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
  const decryptedFilePathOrErrorMessage = await decryptFile(filePath, password);
  console.log(
    'Returning decrypted file path or error message: { ',
    decryptedFilePathOrErrorMessage,
    ' }',
  );
  return decryptedFilePathOrErrorMessage;
});

ipcMain.handle('prettyPrintFilePath', (_event, [filePath]) => {
  console.log('prettyPrintFilePath', '{', filePath, '}');
  // If poth starts with os.getHomeDir(), replace it with '~'
  if (filePath.startsWith(homedir())) {
    filePath = filePath.replace(homedir(), '~');
  }

  // TODO: On frontend, if path is too long to display (based on window width), do some middle truncation and offer a one-click copy to clipboard

  return filePath;
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

const installExtensions = async () => {
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
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 750,
    minWidth: 700,
    height: 400,
    minHeight: 400,
    resizable: true,
    autoHideMenuBar: true,
    icon: getAssetPath('icon.png'), // TODO: icon isn't being used on Fedora dev builds. Need to check macOS builds. /home/alichtman/Desktop/Development/projects/deadbolt/assets/icon.png is returned, which is correct
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

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
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
