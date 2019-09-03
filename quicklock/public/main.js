/**********
 * Requires
 **********/

const { app, BrowserWindow } = require("electron");
const homedir = require("os").homedir();
const fs = require("fs-extra");
const crypto = require("crypto");
const zlib = require("zlib");
const { Transform } = require('stream');
const { spawnSync } = require("child_process");

/********
 * Config
 ********/

/** Constants */

const CONFIG_PATH = `${homedir}/.quickLock`;

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
	fs.writeFileSync(
		filePath,
		JSON.stringify(config, null, 2) + "\r\n",
		"utf8",
		err => {
			if (err) {
				console.log("Error writing to config file", err);
			} else {
				console.log("Successfully wrote new config.");
			}
		}
	);
}

function safeCreateDefaultConfig() {
	if (!fs.existsSync(CONFIG_PATH)) {
		console.log(`Detected missing config. Writing default at ${CONFIG_PATH}.`);
		let defaultConfig = {
			deleteEncryptedFileAfterDecryption: "false",
			deleteUnencryptedFileAfterEncryption: "false",
			encryptedExtension: ".enc"
		};
		writeConfigFileSync(CONFIG_PATH, defaultConfig);
	}
}

/*********************
 * File System Helpers
 *********************/

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
		await fs.remove(path);
		console.log(`Successfully removed ${path}.`);
		return true;
	} catch (err) {
		console.error(`Error removing ${path}: ${err}`);
		return false;
	}
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
	return input.substring(0, index) + replacement + input.substring(index + search.length);
}

// TODO: File icon changes.

/**
 * Transform Stream for prepending metadata to encrypted file.
 */
class PrependMetadata extends Transform {
	constructor(salt, initVect, opts) {
		super(opts);
		this.salt = salt;
		this.initVect = initVect;
	}

	_transform(chunk, encoding, cb) {
		this.push(this.salt);
		this.push(this.initVect);
		this.push(chunk);
		cb();
	}
}

/**
 * AES-256 Encryption
 */

/** Crypto Constants */

const AES_256_GCM = "aes-256-gcm";
const METADATA_LEN = 80;

/**
 * Returns a SHA512 digest to be used as the key for AES encryption. Uses a 64 byte salt with 10,000 iterations of PBKDF2
 * Follows the NIST standards described here: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf
 * @param  {Buffer} salt          16 byte random salt
 * @param  {string} encryptionKey User's entered encryption key
 * @return {Buffer}               SHA512 hash that will be used as the IV.
 */
function createDerivedKey(salt, encryptionKey) {
	return crypto.pbkdf2Sync(encryptionKey, salt, iterations = 10000, keylen = 32, digest = "sha512");
}

/**
 * Encrypts a file using this format:
 * (https://gist.github.com/AndiDittrich/4629e7db04819244e843)
 * +--------------------+-----------------------+----------------+----------------+
 * | Salt               | Initialization Vector | TODO: Auth Tag | Payload        |
 * | Used to derive key | AES GCM XOR Init      | Data Integrity | Encrypted File |
 * | 64 Bytes, random   | 16 Bytes, random      | 16 Bytes       | (N-96) Bytes   |
 * +--------------------+-----------------------+----------------+----------------+
 *
 * @param  {String} filePath      Absolute path of unencrypted file.
 * @param  {String} encryptionKey User verified encryption key.
 * @param  {Object} config        User config dictionary.
 * @return {String}               Absolute path of encrypted file.
 */
function encryptFile(filePath, encryptionKey, config) {
	console.log(`Encrypting ${filePath} with key: ${encryptionKey}`);

	// Create cipher
	const salt = crypto.randomBytes(64);
	const derivedKey = createDerivedKey(salt, encryptionKey);
	const initializationVector = crypto.randomBytes(16);
	TEST_GLOBAL_IV = initializationVector;
	TEST_GLOBAL_SALT = salt;
	let cipher = crypto.createCipheriv(AES_256_GCM, derivedKey, initializationVector);

	// Store salt and initialization vector
	// TODO: Store authTag
	let prependMetadata = new PrependMetadata(salt, initializationVector);
	let encryptedFilePath = `${filePath}${config.encryptedExtension}`;
	console.log(`Encrypted file will be created at ${encryptedFilePath}`);
	let write = fs.createWriteStream(encryptedFilePath);

	fs.createReadStream(filePath)
		.pipe(zlib.createGzip())
		.pipe(cipher)
		.pipe(prependMetadata)
		.pipe(write);

	return encryptedFilePath;
}

// debugging
var TEST_GLOBAL_IV = "";
var TEST_GLOBAL_SALT = "";

/**
 * Decrypts a file.
 * @param  {String} filePath      Absolute path of encrypted file.
 * @param  {String} decryptionKey Unverified decryption key supplied by user
 * @param  {Object} config        User config dictionary.
 * @return {String}               Absolute path of unencrypted file.
 */
function decryptFile(filePath, decryptionKey, config) {
	console.log("Extracting metadata from encrypted file.");
	// Read salt and IV from beginning of file.
	let salt, initializationVector;
	const readMetadata = fs.createReadStream(filePath, { end: METADATA_LEN });
	readMetadata.on('data', (chunk) => {
		console.log(`METADATA LEN: ${chunk.length}`)
		salt = chunk.slice(0, 64);
		initializationVector = chunk.slice(65, 81);
		console.log(`SALT MATCH: ${salt == TEST_GLOBAL_SALT}`)
		console.log(`IV MATCH: ${initializationVector == TEST_GLOBAL_IV}`)
		console.log(`SALT: ${salt.length}`);
		console.log(`IV: ${initializationVector.length}`);
	});
	readMetadata.on('close', () => {
		// start decrypting the cipher text
		const derivedKey = createDerivedKey(salt, decryptionKey);
		let decrypt = crypto.createDecipheriv(AES_256_GCM, derivedKey, initializationVector);

		let decryptedFilePath = replaceLast(filePath, config.encryptedExtension, "") + ".1";
		console.log(`Decrypted file will be at: ${decryptedFilePath}`)
		let write = fs.createWriteStream(decryptedFilePath);

		const encryptedFile = fs.createReadStream(filePath, { start: METADATA_LEN });
		encryptedFile
			.pipe(decrypt)
			.pipe(zlib.createGunzip())
			.pipe(write);

		return decryptedFilePath;
	});
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
	console.log("\ENCRYPT FILE REQUEST\n");
	let config = readConfigFileSync(CONFIG_PATH);
	let encryptedFilePath = encryptFile(filePath, encryptionPhrase, config);
	console.log(encryptedFilePath);
	// TODO: Change file icon of new encrypted file.
	return encryptedFilePath;
}

/**
 * QuickLock file decryption process.
 * @param  {String} filePath Absolute path of file.
 * @return {Bool}            True if decryption was successful, False otherwise.
 */
function onFileDecryptRequest(filePath, decryptionPhrase) {
	console.log("\nDECRYPT FILE REQUEST\n");
	let config = readConfigFileSync(CONFIG_PATH);
	let decryptedFilePath = decryptFile(filePath, decryptionPhrase, config);

	// // Verify decryption by comparing SHA1 sums
	// if (getHashFromFilePath(filePath) == hashFile(decryptedFilePath)) {
	// 	console.log("Successful decryption.");
	// 	if (config.deleteEncryptedFileAfterDecryption) {
	// 		console.log("Removing encrypted file after successful decryption.");
	// 		// removeFileOrDir(filePath);
	// 	}
	// 	return True;
	// } else {
	// 	console.log(
	// 		"Failed decryption. Password was incorrect (or there is a bug in my code)."
	// 	);
	// 	// DO NOT UNCOMMENT: Remove incorrectly decrypted file.
	// 	// Scary code until we're sure there's no way a path we don't want to remove gets passed in here...
	// 	// removeFileOrDir(decryptedFilePath);
	// 	return False;
	// }
}

function createWindow() {
	// Create the browser window.
	win = new BrowserWindow({
		width: 330,
		height: 364,
		titleBarStyle: "hidden"
	});

	win.loadURL("http://localhost:3000/");
	win.webContents.openDevTools();
}

function main() {
	safeCreateDefaultConfig()
	// test.txt -> test.txt.enc
	onFileEncryptRequest("/Users/alichtman/Desktop/clean/test.txt", "test")
	// test.txt.enc -> test.txt.1
	onFileDecryptRequest("/Users/alichtman/Desktop/clean/test.txt.enc", "test")
	// Confirm they're the same with $ diff test.txt test.txt.1
}

main()

// app.on("ready", createWindow);
