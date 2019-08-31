/**********
 * Requires
 **********/

const { app, BrowserWindow } = require("electron");
const homedir = require('os').homedir();
const fs = require("fs-extra");
const crypto = require("crypto");
const zlib = require("zlib");
const { spawnSync } = require("child_process");

/*********
 * Globals
 *********/

const configFilePath = `${homedir}/.quickLock`;
const encryptionAlgorithm = "aes-256-ctr";
const uniqueGzipExtension = ".gz-ql"

/********
 * Config
 ********/

/**
 * Reads config file synchronously.
 * @param  {String} filePath
 * @return {Object}					Config file contents as dict
 */
function readConfigFileSync(filePath) {
	console.log(`Reading config file: ${filePath}`);
	try {
		const jsonString = fs.readFileSync(filePath);
		const config = JSON.parse(jsonString);
		console.log("Successfully read config file.");
		return config;
	} catch (err) {
		console.log(`Error reading config file: ${err}`);
		process.exit();
	}
}

/**
 * Writes config file synchronously.
 * @param  {String} filePath
 * @param  {Object} config		Dict of config flags
 */
function writeConfigFileSync(filePath, config) {
	fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + "\r\n", "utf8", err => {
		if (err) {
			console.log("Error writing to config file", err);
		} else {
			console.log("Successfully wrote new config.");
		}
	});
}

function safeCreateDefaultConfig() {
	if (!fs.existsSync(configFilePath)) {
		console.log(`Detected missing config. Writing default at ${configFilePath}.`);
		let defaultConfig = {
			deleteEncryptedFileAfterDecryption: "false",
			deleteUnencryptedFileAfterEncryption: "false",
			encryptedExtension: ".enc"
		};
		writeConfigFileSync(configFilePath, defaultConfig);
	}
}

/*********************
 * File System Helpers
 *********************/

/**
 * @param  {[type]}  path The absolute filePath
 * @return {Boolean}      True if the path is a directory, else false.
 */
function isDir(path) {
	return fs.lstatSync(path).isDirectory();
}

/**
 * Uses the UNIX file utility to determine if the file is encrypted.
 * @param  {String} filePath The absolute filePath
 * @return {Bool}   True if file is encrypted, False otherwise.
 */
function isFileEncrypted(filePath) {
	const child = spawnSync(`file ${filePath}`);
	console.log(`file ${filePath} stdout:`, child.stdout);
	return child.stdout.includes("openssl enc'd data with salted password");
}

/**
 * $ rm -rf path ... Be careful. You've been warned.
 * @param  {String} path Absolute path of file or directory
 * @return {Bool}        True on success, False on failure.
 */
async function removeFileOrDir(path) {
	try {
		await fs.remove(path)
		console.log(`Successfully removed ${path}.`)
		return true;
	} catch (err) {
		console.error(`Error removing ${path}: ${err}`)
		return false;
	}
}

// TODO: File icon changes.

/********
 * Crypto
 ********/

/**
 * Get SHA1 hex digest of file.
 * Modified from https://gist.github.com/GuillermoPena/9233069#gistcomment-2364896
 * @param  {String} filename                  Name of file to hash
 * @param  {String} hashingAlgorithm='sha1'   Hashing algorithm to use. Depends on OpenSSL
 * @return {String}                           SHA1 Hex Digest
 */
function fileHash(filename, hashingAlgorithm = "sha1") {
	console.log(`Hashing ${filename} with ${hashingAlgorithm}`);
	let shasum = crypto.createHash(hashingAlgorithm);
	let fileStream = fs.ReadStream(filename);
	fileStream.on("data", function (data) {
		shasum.update(data);
	});
	fileStream.on("end", function () {
		console.log(`Hash: ${shasum.digest("hex")}`);
		return shasum.digest("hex");
	});
}

/**
 * Returns the SHA1 hash from an encrypted file path.
 * @param  {String} encryptedFilePath Absolute file path of encrypted file.
 * @return {String}                   SHA1 hex digest.
 */
function getHashFromFilePath(encryptedFilePath) {
	console.log(`Extracting hash from ${encryptedFilePath}`);
	var filePathComponents = filePath.split(".");
	let hashIdx = filePathComponents.length - 2;
	console.log(`Hash: ${filePathComponents[hashIdx]}`);
	return filePathComponents[hashIdx];
}

/**
 * Encrypts a file.
 * @param  {String} filePath      Absolute path of unencrypted file.
 * @param  {String} encryptionKey User verified encryption key.
 * @param  {Object} config        User config dictionary.
 * @return {String}               Absolute path of encrypted file.
 */
function encryptFile(filePath, encryptionKey, config) {
	console.log(`Encrypting ${filePath} with key: ${encryptionKey}`);
	let unencryptedFile = fs.createReadStream(filePath);
	// TODO: Apparently this is deprecated?
	// TODO: Warning: Use Cipheriv for counter mode of aes-256-ctr?
	let encrypt = crypto.createCipher(encryptionAlgorithm, encryptionKey);
	var encryptedFilePath = "";
	let fileEnding = `${fileHash(filePath)}.${config.encryptedExtension}`;

	if (isDir(filePath)) {
		console.log("Directory detected.");
		let zip = zlib.createGzip();
		encryptedFilePath = `${filePath}.${uniqueGzipExtension}.${fileEnding}`;
		let write = fs.createWriteStream(encryptedFilePath);
		console.log(`Encrypting file will be created at ${encryptedFilePath}`);
		return encryptedFilePath
		unencryptedFile
			.pipe(zip)
			.pipe(encrypt)
			.pipe(write);
	} else {
		encryptedFilePath = `${filePath}.${fileEnding}`;
		let write = fs.createWriteStream(encryptedFilePath);
		console.log(`Encrypting file will be created at ${encryptedFilePath}`);
		return encryptedFilePath
		unencryptedFile
			.pipe(encrypt)
			.pipe(write);
	}
	console.log(`Encrypting file created at ${encryptedFilePath}`);
	console.log("Done.");
	return encryptedFilePath;
}

/**
 * Decrypts a file.
 * @param  {String} filePath      Absolute path of encrypted file.
 * @param  {String} decryptionKey Unverified decryption key supplied by user
 * @param  {Object} config        User config dictionary.
 * @return {String}               Absolute path of unencrypted file.
 */
function decryptFile(filePath, decryptionKey, config) {
	let encryptedFile = fs.createReadStream(filePath);
	let decrypt = crypto.createDecipher(encryptionAlgorithm, decryptionKey);
	let write = fs.createWriteStream(decryptedFilePath);

	var filePathComponents = filePath.split(".");
	let fileExtensionIdx = filePathComponents.length - 3;
	var decryptedFilePath = "";

	// If the file was gzipped by us, then ungzip it after decryption.
	if (filePathComponents[fileExtensionIdx] == uniqueGzipExtension) {
		let unzip = zlib.createGunzip();
		decryptedFilePath = filePathComponents.slice(0, fileExtensionIdx - 1).join(".");
		encryptedFile
			.pipe(decrypt)
			.pipe(unzip)
			.pipe(write);
	} else {
		decryptedFilePath = filePathComponents.slice(0, fileExtensionIdx).join(".");
		encryptedFile
			.pipe(decrypt)
			.pipe(write);
	}

	return decryptFilePath;
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
	let config = readConfigFileSync(configFilePath);
	let encryptedFilePath = encryptFile(filePath, encryptionPhrase, config);
	// TODO: Change file icon of new encrypted file.
	return encryptedFilePath;
}

/**
 * QuickLock file decryption process.
 * @param  {String} filePath Absolute path of file.
 * @return {Bool}            True if decryption was successful, False otherwise.
 */
function onFileDecryptRequest(filePath, decryptionPhrase) {
	let config = readConfigFileSync(configFilePath);
	let decryptedFilePath = decryptFile(filePath, decryptionPhrase, config);

	// Verify decryption by comparing SHA1 sums
	if (getHashFromFilePath(filePath) == hashFile(decryptedFilePath)) {
		console.log("Successful decryption.");
		if (config.deleteEncryptedFileAfterDecryption) {
			console.log("Removing encrypted file after successful decryption.");
			// removeFileOrDir(filePath);
		}
		return True;
	} else {
		console.log("Failed decryption. Password was incorrect (or there is a bug in my code).")
		// DO NOT UNCOMMENT: Remove incorrectly decrypted file.
		// Scary code until we're sure there's no way a path we don't want to remove gets passed in here...
		// removeFileOrDir(decryptedFilePath);
		return False;
	}
}

function createWindow() {
	// Create the browser window.
	win = new BrowserWindow({ width: 400, height: 600 });

	// win.loadFile("index.html");
	win.loadURL("http://localhost:3000/");
}

function main() {
	safeCreateDefaultConfig()
	onFileEncryptRequest("/Users/alichtman/Desktop/clean/test.txt", "test")
}

main()

// app.on("ready", createWindow)
