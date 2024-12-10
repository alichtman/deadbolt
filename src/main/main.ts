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
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { encryptFile, decryptFile, EncryptionError, DecryptionError } from './encryptionAndDecryptionLib';


// Electron doesn't let you pass custom error messages from IPCMain to the renderer process
// https://github.com/electron/electron/issues/24427
// There are some workarounds floating around, like https://m-t-a.medium.com/electron-getting-custom-error-messages-from-ipc-main-617916e85151
// but we're going to galaxy brain it and just return a string with a prefix to indicate that it's an error.
// ....

const ERROR_MESSAGE_PREFIX = "ERROR_FROM_ELECTRON_MAIN_THREAD";

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.handle("encryptFileRequest", (_event, [filePath, password]) => {
  console.log("encryptFileRequest", "{", filePath, "} with password of length: ", password.length);
  // You have no idea how much time I killed trying to debug why throwing here and .catch'ing the promise in the renderer process didn't work.
  try {
    const encryptedFilePath = encryptFile(filePath, password);
    console.log("Returning encrypted file path: { ", encryptedFilePath, " }");
    return encryptedFilePath;
  } catch (error) {
    const err = error as Error;
    // In the renderer process, we can check for the prefix and display the error message. Otherwise, the return value is a filepath
    return `${ERROR_MESSAGE_PREFIX}: ${err.message}`
  }
});

ipcMain.handle("decryptFileRequest", (_event, [filePath, password]) => {
  console.log("decryptFileRequest", "{", filePath, "}");
  try {
    const decryptedFilePath = decryptFile(filePath, password);
    console.log("Returning decrypted file path: { ", decryptedFilePath, " }");
  } catch (error) {
    const err = error as Error;
    return `${ERROR_MESSAGE_PREFIX}: ${err.message}`
  }
});

ipcMain.handle("prettyPrintFilePath", (_event, [filePath]) => {
  console.log("prettyPrintFilePath", "{", filePath, "}");
  // If poth starts with os.getHomeDir(), replace it with '~'
  if (filePath.startsWith(homedir())) {
    filePath = filePath.replace(homedir(), '~');
  }

  return filePath;
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
    height: 550,
    minHeight: 400,
    resizable: true,
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

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

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
