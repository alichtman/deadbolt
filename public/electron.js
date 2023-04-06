/***********
 * Constants
 ***********/

const {app, BrowserWindow, ipcMain} = require("electron");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const url = require("url");
const isDev = require("electron-is-dev");

const ENCRYPTED_FILE_EXTENSION = ".dbolt";
const AES_256_GCM = "aes-256-gcm";
const METADATA_LEN = 96;

/***********
 * Utilities
 ***********/

/**
 * Replace last instance of search in input with replacement
 * @param {String} input Input string
 * @param {String} search Substring to search for
 * @param {String} replacement Substring to replace with
 */
function replaceLast(input, search, replacement) {
    // Find last ocurrence
    const index = input.lastIndexOf(search);
    if (index === -1) {
        return input;
    }
    // Replace ocurrence
    return (
        input.substring(0, index) +
        replacement +
        input.substring(index + search.length)
    );
}

function createDecryptedFilePath(filePath) {
    let decryptedFilePath = replaceLast(filePath, ENCRYPTED_FILE_EXTENSION, "");
    let splitPath = decryptedFilePath.split(".");
    splitPath.splice(splitPath.length - 1, 0, "dbolt");
    decryptedFilePath = splitPath.join(".");

    return decryptedFilePath;
}

/********************
 * AES-256 Encryption
 ********************/

/**
 * Returns a SHA512 digest to be used as the key for AES encryption. Uses a 64 byte salt with 10,000 iterations of PBKDF2
 * Follows the NIST standards described here: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf
 * @param  {Buffer} salt          16 byte random salt
 * @param  {string} encryptionKey User's entered encryption key
 * @return {Buffer}               SHA512 hash that will be used as the IV.
 */
function createDerivedKey(salt, encryptionKey) {
    return crypto.pbkdf2Sync(
        encryptionKey,
        salt,
        (iterations = 10000),
        (keylen = 32), // This value is in bytes
        (digest = "sha512")
    );
}

/**
 * Encrypts a file using this format:
 * (https://gist.github.com/AndiDittrich/4629e7db04819244e843)
 * +--------------------+-----------------------+----------------+----------------+
 * | Salt               | Initialization Vector | Auth Tag       | Payload        |
 * | Used to derive key | AES GCM XOR Init      | Data Integrity | Encrypted File |
 * | 64 Bytes, random   | 16 Bytes, random      | 16 Bytes       | (N-96) Bytes   |
 * +--------------------+-----------------------+----------------+----------------+
 *
 * A huge thank you to: https://medium.com/@brandonstilson/lets-encrypt-files-with-node-85037bea8c0e
 *
 * @param  {String} filePath      Absolute path of unencrypted file.
 * @param  {String} encryptionKey User verified encryption key.
 * @return {String}               Absolute path of encrypted file.
 */
function encryptFile(filePath, encryptionKey) {
    // Create cipher
    const salt = crypto.randomBytes(64);
    const derivedKey = createDerivedKey(salt, encryptionKey);
    const initializationVector = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv(
        AES_256_GCM,
        derivedKey,
        initializationVector
    );

    const encryptedFilePath = `${filePath}${ENCRYPTED_FILE_EXTENSION}`;
    const tempAuthTag = Buffer.from({length: 16}).fill(0xff);
    const writeStream = fs.createWriteStream(encryptedFilePath);

    // Write salt, IV, and temporary auth tag to encrypted file. The auth tag
    // will be replaced with a real auth tag later.
    writeStream.write(salt);
    writeStream.write(initializationVector);
    writeStream.write(tempAuthTag);

    // Encrypt file and write it to encrypted dest file
    fs.createReadStream(filePath)
        .pipe(cipher)
        .pipe(writeStream)
        .on("finish", () => {
            const realAuthTag = cipher.getAuthTag();
            const fd = fs.openSync(encryptedFilePath, "r+");

            fs.write(fd, realAuthTag, 0, 16, 80, () => {});
        });

    return encryptedFilePath;
}

/**
 * Decrypts a file.
 * @param  {String} filePath      Absolute path of encrypted file.
 * @param  {String} decryptionKey Unverified decryption key supplied by user.
 * @param  {Object} event         Reference to the IPC Renderer channel.
 * @return {String}               Absolute path of unencrypted file.
 */
function decryptFile(filePath, decryptionKey, event) {
    // Read salt, IV and authTag from beginning of file.
    let salt, initializationVector, authTag;
    const decryptedFilePath = createDecryptedFilePath(filePath);
    const readMetadata = fs.createReadStream(filePath, {end: METADATA_LEN});

    readMetadata.on("data", chunk => {
        salt = chunk.slice(0, 64);
        initializationVector = chunk.slice(64, 80);
        authTag = chunk.slice(80, 96);
    });
    readMetadata.on("close", () => {
        // Decrypt the cipher text
        const derivedKey = createDerivedKey(salt, decryptionKey);
        const decrypt = crypto.createDecipheriv(
            AES_256_GCM,
            derivedKey,
            initializationVector
        );

        // Handle decryption errors. This will throw if the password is incorrect.
        decrypt.setAuthTag(authTag);

        const decryptedFileWriteStream = fs.createWriteStream(
            decryptedFilePath
        );
        const encryptedFileWriteStream = fs.createReadStream(filePath, {
            start: METADATA_LEN
        });
        encryptedFileWriteStream
            .pipe(decrypt)
            .on("error", () => {
                fs.unlinkSync(decryptedFilePath);
                event.reply("decryptFileResponse", {
                    decryptedFilePath,
                    error: true
                });
            })
            .pipe(decryptedFileWriteStream)
            .on("finish", () =>
                event.reply("decryptFileResponse", {
                    decryptedFilePath,
                    error: false
                })
            );
    });

    return decryptedFilePath;
}

/**************
 * Window Setup
 **************/

let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 330,
        height: 340,
        resizable: true,
        // resizable: false,
        titleBarStyle: "hidden",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    if (isDev) {
        console.log("Running in development");
        // mainWindow.loadURL("http://localhost:3000");
        mainWindow.loadFile('build/index.html')
    } else {
    }
    // : `file://${path.join(__dirname, "../build/index.html")}`
    mainWindow.on("closed", () => (mainWindow = null));
    // mainWindow.webContents.openDevTools();
}

app.on("ready", () => createWindow());
app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

ipcMain.on("encryptFileRequest", (event, arg) => {
    const {filePath, password} = arg;
    event.returnValue = encryptFile(filePath, password);
});
ipcMain.on("decryptFileRequest", (event, arg) => {
    const {filePath, password} = arg;
    decryptFile(filePath, password, event);
});
