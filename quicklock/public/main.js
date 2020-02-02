/**********
 * Requires
 **********/

const { app, BrowserWindow } = require("electron");
const fs = require("fs-extra");
const crypto = require("crypto");
const zlib = require("zlib");
const { Transform } = require("stream");

const encryptedExtension = ".qlock";

/*********************
 * File System Helpers
 *********************/

/**
 * Uses the file extension to determine if it's encrypted.
 * @param  {String} filePath The absolute filePath
 * @return {Bool}   True if file is encrypted, False otherwise.
 */
function isFileEncrypted(filePath, config) {
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
 * Transform Stream for prepending metadata to encrypted file.
 */
class PrependMetadata extends Transform {
	constructor(salt, initVect, authTag, opts) {
		super(opts);
		this.salt = salt;
		this.initVect = initVect;
		this.authTag = authTag;
		this.alreadyAppended = false;
	}

	_transform(chunk, encoding, cb) {
		if (!this.alreadyAppended) {
			this.push(this.salt);
			this.push(this.initVect);
			this.push(this.authTag);
			this.alreadyAppended = true;
		}
		this.push(chunk);
		cb();
	}
}

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
 * @param  {Object} config        User config dictionary.
 * @return {String}               Absolute path of encrypted file.
 */
function encryptFile(filePath, encryptionKey, config) {
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

	// Run gzip'd file through cipher
	let encryptBlob = fs
		.createReadStream(filePath)
		.pipe(zlib.createGzip())
		.pipe(cipher)
		.on("finish", () => {
			// Store salt, initialization vector and authTag at the head of the encrypted blob for use during decryption.
			encryptBlob
				.pipe(
					new PrependMetadata(
						salt,
						initializationVector,
						cipher.getAuthTag()
					)
				)
				.pipe(write);
		});

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
	console.log("Extracting metadata from encrypted file.");
	// Read salt, IV and authTag from beginning of file.
	let salt, initializationVector, authTag;
	const readMetadata = fs.createReadStream(filePath, { end: METADATA_LEN });
	readMetadata.on("data", chunk => {
		// console.log(`METADATA LEN: ${chunk.length}`)
		salt = chunk.slice(0, 64);
		initializationVector = chunk.slice(64, 80);
		authTag = chunk.slice(80, 96);
		// console.log(`Salt: ${salt.length}`);
		// console.log(`InitVect: ${initializationVector.length}`);
		// console.log(`AuthTag: ${authTag.length}`);
	});
	readMetadata.on("close", () => {
		// Decrypt the cipher text
		const derivedKey = createDerivedKey(salt, decryptionKey);
		let decrypt = crypto.createDecipheriv(
			AES_256_GCM,
			derivedKey,
			initializationVector
		);
		decrypt.setAuthTag(authTag);

		let decryptedFilePath =
			replaceLast(filePath, encryptedExtension, "") + ".1";
		console.log(`Decrypted file will be at: ${decryptedFilePath}`);
		let write = fs.createWriteStream(decryptedFilePath);

		const encryptedFile = fs.createReadStream(filePath, {
			start: METADATA_LEN
		});
		// Decryption errors will come from the zlib.createGunzip line
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
	console.log("ENCRYPT FILE REQUEST\n");
	let config = readConfigFileSync(CONFIG_PATH);
	let encryptedFilePath = encryptFile(filePath, encryptionPhrase, config);
	console.log(encryptedFilePath);
	// TODO: Change file icon of new encrypted file.
	return encryptedFilePath;
}

/**
 * QuickLock file decryption process.
 * @param  {String} filePath Absolute path of file.
 * @return {Bool}            true if decryption was successful, false otherwise.
 */
function onFileDecryptRequest(filePath, decryptionPhrase) {
	console.log("\nDECRYPT FILE REQUEST\n");
	let config = readConfigFileSync(CONFIG_PATH);
	try {
		decryptFile(filePath, decryptionPhrase, config);
		console.log("Successful decryption.");
		return true;
	} catch (error) {
		console.log("Failed decryption. Incorrect password.");
		return false;
	}
}

/**
 * CLI Integration / Main
 **/

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

function testing_main() {
	safeCreateDefaultConfig();
	// test.txt -> test.txt.enc
	onFileEncryptRequest("/Users/alichtman/Desktop/clean/test.txt", "test");
	// test.txt.enc -> test.txt.1
	setTimeout(function() {
		onFileDecryptRequest(
			"/Users/alichtman/Desktop/clean/test.txt.enc",
			"te2st"
		);
	}, 3000);

	// Confirm they're the same with $ diff test.txt test.txt.1
}

// testing_main()

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

// for unit testing purposes
module.exports = { onFileEncryptRequest, onFileDecryptRequest };
