/**********
 * Requires
 **********/

const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const crypto = require("crypto");

const path = require("path");
const url = require("url");
const isDev = require("electron-is-dev");

const encryptedExtension = ".qlock";

/*********************
 * File System Helpers
 *********************/

/**
 * Uses the file extension to determine if it's encrypted.
 * @param  {String} filePath The absolute filePath
 * @return {Bool}   True if file is encrypted, False otherwise.
 */
function isFileEncrypted(filePath) {
	return filePath.endsWith(encryptedExtension);
}

/**
 * String Helpers
 */

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

// TODO: File icon changes.

/**
 * AES-256 Encryption
 */

/** Crypto Constants */

const AES_256_GCM = "aes-256-gcm";
const METADATA_LEN = 96;

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
		(keylen = 32),
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
	console.log(`Encrypting ${filePath} with key: ${encryptionKey}`);

	// Create cipher
	const salt = crypto.randomBytes(64);
	const derivedKey = createDerivedKey(salt, encryptionKey);
	const initializationVector = crypto.randomBytes(16);
	let cipher = crypto.createCipheriv(
		AES_256_GCM,
		derivedKey,
		initializationVector
	);

	let encryptedFilePath = `${filePath}${encryptedExtension}`;
	console.log(`Encrypted file will be created at ${encryptedFilePath}`);
	let write = fs.createWriteStream(encryptedFilePath);
	write.on("error", () => console.log("Write error."));

	// Write salt, IV, and temporary auth tag to encrypted file. The auth tag
	// will be replaced with a real auth tag later.
	write.write(salt);
	write.write(initializationVector);
	let temporary_auth_tag = Buffer.from({ length: 16 }).fill(0xff);
	write.write(temporary_auth_tag);

	// Encrypt file and write it to encrypted dest file
	fs.createReadStream(filePath)
		.pipe(cipher)
		.pipe(write)
		.on("finish", () => {
			let real_auth_tag = cipher.getAuthTag();
			const fd = fs.openSync(encryptedFilePath, "r+");
			fs.write(fd, real_auth_tag, 0, 16, 80, () => {});
		});

	return encryptedFilePath;
}

/**
 * Decrypts a file.
 * @param  {String} filePath      Absolute path of encrypted file.
 * @param  {String} decryptionKey Unverified decryption key supplied by user
 * @return {String}               Absolute path of unencrypted file.
 */
function decryptFile(filePath, decryptionKey) {
	console.log("Extracting metadata from encrypted file.");
	// Read salt, IV and authTag from beginning of file.
	let salt, initializationVector, authTag;
	var decryptedFilePath = replaceLast(filePath, encryptedExtension, "");
	let splitPath = decryptedFilePath.split(".");
	splitPath.splice(splitPath.length - 1, 0, "qlock");
	decryptedFilePath = splitPath.join(".");

	const readMetadata = fs.createReadStream(filePath, { end: METADATA_LEN });
	readMetadata.on("data", chunk => {
		salt = chunk.slice(0, 64);
		initializationVector = chunk.slice(64, 80);
		authTag = chunk.slice(80, 96);
	});
	readMetadata.on("close", () => {
		// Decrypt the cipher text
		const derivedKey = createDerivedKey(salt, decryptionKey);
		let decrypt = crypto.createDecipheriv(
			AES_256_GCM,
			derivedKey,
			initializationVector
		);

		// Handle decryption errors. This will throw if the password is incorrect.
		try {
			decrypt.setAuthTag(authTag);
		} catch (err) {
			return "QUICKLOCK_ENCRYPTION_FAILURE";
		}

		console.log(`Decrypted file will be at: ${decryptedFilePath}`);
		let write = fs.createWriteStream(decryptedFilePath);

		const encryptedFile = fs.createReadStream(filePath, {
			start: METADATA_LEN
		});
		encryptedFile.pipe(decrypt).pipe(write);

		return decryptedFilePath;
	});

	return decryptedFilePath;
}

/**************
 * Entry Points
 **************/

/**
 * QuickLock file encryption process.
 * @param  {String} filePath         Absolute path of file.
 * @param  {String} encryptionPhrase Passphrase for encryption that has been verified by the user already in the GUI.
 * @return {String}                  Absolute path of encrypted file.
 */
function onFileEncryptRequest(filePath, encryptionPhrase) {
	console.log("\nENCRYPT FILE REQUEST\n");
	let encryptedFilePath = encryptFile(filePath, encryptionPhrase);
	console.log(encryptedFilePath);
	// TODO: Change file icon of new encrypted file.
	// TODO: Reveal in Finder
	return encryptedFilePath;
}

/**
 * QuickLock file decryption process.
 * @param  {String} filePath Absolute path of file.
 * @return {Bool}            true if decryption was successful, false otherwise.
 */
function onFileDecryptRequest(filePath, decryptionPhrase) {
	console.log("\nDECRYPT FILE REQUEST\n");
	let decryptedFilePath = decryptFile(filePath, decryptionPhrase);
	console.log("decryptedFilePath:", decryptedFilePath);
	return decryptedFilePath;
}

/**
 * CLI Integration / Main
 **/

let mainWindow;

function createWindow() {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 330,
		height: 340, // 364
		resizable: false,
		titleBarStyle: "hidden",
		webPreferences: {
			nodeIntegration: true
		}
	});

	mainWindow.loadURL(
		isDev
			? "http://localhost:3000"
			: `file://${path.join(__dirname, "../build/index.html")}`
	);
	mainWindow.on("closed", () => (mainWindow = null));
	mainWindow.webContents.openDevTools();
}

function checkIfCalledViaCLI(args) {
	if (args && args.length > 1) {
		return true;
	}
	return false;
}

app.on("ready", () => {
	if (checkIfCalledViaCLI(process.argv)) {
		// TODO: Parse arguments and either show encrypt or decrypt screen.
		let filename = process.argv[process.argv.length - 1];
		console.log(`File passed on command line: ${filename}`);
		if (isFileEncrypted(filename)) {
			// TODO: Open to decrypt file screen to prompt for pass
		} else {
			// TODO: Open to encrypt file screen to prompt for pass
		}
	}

	createWindow();
});

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
	const { filePath, password } = arg;
	let encryptedFilePath = onFileEncryptRequest(filePath, password);
	event.returnValue = encryptedFilePath;
});
ipcMain.on("decryptFileRequest", (event, arg) => {
	const { filePath, password } = arg;
	let decryptedFilePath = onFileDecryptRequest(filePath, password);
	event.returnValue = decryptedFilePath;
});
