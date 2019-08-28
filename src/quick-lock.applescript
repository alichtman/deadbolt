-- Quick Lock v1.3
-- Easy File/Folder Encryption and Decryption with openssl
-- Written by: Aaron Lichtman <aaronlichtman@gmail.com>

-- Notes to anyone editing this script:
-- Watch the quoting of paths. Unlike bash, AppleScript chokes on paths that are quoted more than once, so you can't just throw a pair of quotes around a path randomly.

----------------------
-- Globals / Constants
----------------------

global encryptedExtension
global cdToRightDir
global configFile
set configFile to POSIX path of (path to home folder) & ".encrypt-decrypt.plist"

-------------------
-- Helper Functions
-------------------

-- https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/ManipulateText.html
on findAndReplaceInText(theText, theSearchString, theReplacementString)
	set AppleScript's text item delimiters to theSearchString
	set theTextItems to every text item of theText
	set AppleScript's text item delimiters to theReplacementString
	set theText to theTextItems as string
	set AppleScript's text item delimiters to ""
	return theText
end findAndReplaceInText

-- TODO: Is this the proper way to do that?
on userExit()
	error number -128
end userExit

on readValueFromConfig(key)
	tell application "System Events"
		tell property list file configFile
			return value of property list item key
		end tell
	end tell
end readValueFromConfig

-- Returns true if the path exists as either a file or directory
on checkIfFileExists(path)
	try
		do shell script cdToRightDir & "test -e " & path
	on error
		return false
	end try
	return true
end checkIfFileExists

on removeFile(path)
	log "Removing: " & path
	do shell script cdToRightDir & "rm " & path
end removeFile

on decompressAndRemoveZip(filePath)
	-- If it's a zip, auto decompress it and remove the zip
	set decryptedFileType to getFileType(filePath)
	log "Decrypted File Type: " & decryptedFileType
	if decryptedFileType starts with "Zip" then
		do shell script cdToRightDir & " unzip -u " & filePath
		removeFile(filePath)
	end if
end decompressAndRemoveZip

-- Removes zip archive if we created it and then exits. zipPath should be quoted already.
on cleanUpAndExit(isEncryptingDirFlag, zipAlreadyExistedFlag, zipPath)
	log "Cleaning up and exiting."
	if isEncryptingDirFlag and not zipAlreadyExistedFlag then
		removeFile(zipPath)
	end if
	userExit()
end cleanUpAndExit

-- Returns the SHA1 sum of the filePath passed in. filePath should be quoted already
on hashFile(filePath)
	set hashCommand to cdToRightDir & "openssl sha1 " & filePath & " | rev | cut -d' ' -f1 | rev"
	log "Hash command: $ " & hashCommand
	set hash to do shell script hashCommand
	log "Hashing: " & filePath & " -> " & hash
	return hash
end hashFile

on getFileType(escapedFilePath)
	set fileType to do shell script "file " & escapedFilePath & " | sed 's/^.*: //'"
	log "Detected fileType: " & fileType
	return fileType
end getFileType

on changeFileIcon(encryptedFileName)
	set appPath to "/Applications/Quick\\ Lock.app/Contents/"
	set pngIconFile to appPath & "/Resources/EncryptedFileIcon.png"
	log "PNG Icon File: " & pngIconFile
	set changeFileScript to appPath & "/MacOS/set-custom-icon.sh"
	log "Change File Script: " & changeFileScript
	set encryptedFileNameTrimmed to text 2 through -2 of encryptedFileName
	log "Encrypted File Trimmed: " & encryptedFileNameTrimmed
	set changeFileIconCommand to cdToRightDir & changeFileScript & " " & pngIconFile & " " & encryptedFileNameTrimmed
	log "Change File Icon Command: $ " & changeFileIconCommand
	do shell script changeFileIconCommand
end changeFileIcon

-- Prompt for passphrase, enter it and verify decryption. If it's a ZIP, auto-extract and delete ZIP.
on decryptFile(encryptedFilePath)
	log "Decrypting: " & encryptedFilePath
	set decryptionKey to the text returned of (display dialog "Enter a decryption password:" default answer "")
	
	-- Extract file hash from filename for decryption success verification
	set originalHash to do shell script "echo " & encryptedFilePath & " | rev | cut -d'.' -f 2 | rev"
	log "Original Hash: " & originalHash
	set unencryptedFilePath to quoted form of findAndReplaceInText(encryptedFilePath, "." & originalHash & encryptedExtension, "")
	log "Unencrypted FilePath: " & unencryptedFilePath
	-- Decrypt the file
	set quotedEncryptedFilePath to quoted form of encryptedFilePath
	log "Decryption Command: $ openssl enc -d -aes-256-ctr -salt -in " & quotedEncryptedFilePath & " -out " & unencryptedFilePath & " -pass pass:" & decryptionKey
	do shell script "openssl enc -d -aes-256-ctr -salt -in " & quotedEncryptedFilePath & " -out " & unencryptedFilePath & " -pass pass:" & decryptionKey
	
	-- Detect decryption failures by comparing the checksums
	set newHash to hashFile(unencryptedFilePath)
	if newHash is not equal to originalHash then
		log "Potential decryption error. Original hash (" & originalHash & ") does not match New Hash (" & newHash & ")"
		-- Prompt to see if they want to continue when a hash-mismatch is detected.
		-- The only time this should be continued through is when decrypting a file without a hash.
		set potentialErrorPrompt to (display dialog "Potential decryption error. If the file you are trying to decrypt is missing a SHA1 hash, click 'Continue'. Otherwise, click 'Abort'" buttons {"Abort", "Continue"} default button "Continue")
		if button returned of potentialErrorPrompt = "Abort" then
			log "Aborting decryption."
			removeFile(unencryptedFilePath)
			userExit()
		end if
	else
		log "Successful decryption!"
		display dialog "Successful decryption!"
		
		-- If the option to remove encrypted files after decrypting is set, remove the file
		if readValueFromConfig("deleteEncryptedFileAfterDecryption") is equal to true then
			log "Removing encrypted file after successful decryption."
			removeFile(quotedEncryptedFilePath)
		else
			log "Not removing encrypted file after successful decryption."
		end if
	end if
	
	decompressAndRemoveZip(unencryptedFilePath)
end decryptFile

on encryptFile(filePath, parentDir)
	set fileToBeEncrypted to filePath
	set zipAlreadyExistedFlag to false
	set isEncryptingDirFlag to false
	
	-- If the filePath is a folder, compress it into a zip file.
	if kind of (info for filePath) is "folder" then
		set isEncryptingDirFlag to true
		log "Encrypting Directory."
		set dirToBeZipped to findAndReplaceInText(text 1 through -2 of filePath, parentDir & "/", "")
		log "DirToBeZipped: " & dirToBeZipped
		log "Created: " & fileToBeEncrypted
		set fileToBeEncrypted to dirToBeZipped & ".zip"
		set quotedFileToBeEncrypted to quoted form of fileToBeEncrypted
		set zipAlreadyExistedFlag to checkIfFileExists(quotedFileToBeEncrypted)
		set zipCommand to cdToRightDir & "zip -r " & quotedFileToBeEncrypted & " " & quoted form of (dirToBeZipped & "/")
		log "Zip Command: $ " & zipCommand
		do shell script zipCommand
	else
		set quotedFileToBeEncrypted to quoted form of filePath
	end if
	
	-- Remove ZIP if user exits at either of these prompts
	set encryptionKeyPrompt to (display dialog "Enter an encryption password for file: " & fileToBeEncrypted buttons {"Cancel Encryption", "Ok"} default answer "" default button "Ok")
	if button returned of encryptionKeyPrompt = "Cancel Encryption" then
		log "Aborting encryption at first password prompt."
		cleanUpAndExit(isEncryptingDirFlag, zipAlreadyExistedFlag, quotedFileToBeEncrypted)
	end if
	
	set encryptionKeyConfirmationPrompt to (display dialog "Confirm the password: " & fileToBeEncrypted buttons {"Cancel Encryption", "Ok"} default answer "" default button "Ok")
	if button returned of encryptionKeyConfirmationPrompt = "Cancel Encryption" then
		log "Aborting encryption at second password prompt."
		cleanUpAndExit(isEncryptingDirFlag, zipAlreadyExistedFlag, quotedFileToBeEncrypted)
	end if
	
	-- Validate the encryption key the user has provided to make sure there aren't any typos.
	set encryptionKey to the text returned of encryptionKeyPrompt
	if encryptionKey is not equal to the text returned of encryptionKeyConfirmationPrompt then
		display dialog "ERROR: Encryption passwords did not match."
		log "ERROR: Passwords didn't match"
		userExit()
	end if
	
	set encryptedFileName to quoted form of (fileToBeEncrypted & "." & hashFile(quoted form of fileToBeEncrypted) & encryptedExtension)
	log "Encryption Command: $ openssl enc -aes-256-ctr -salt -in " & quotedFileToBeEncrypted & " -out " & encryptedFileName & " -pass pass:" & encryptionKey
	do shell script cdToRightDir & "openssl enc -aes-256-ctr -salt -in " & quotedFileToBeEncrypted & " -out " & encryptedFileName & " -pass pass:" & encryptionKey
	
	changeFileIcon(encryptedFileName)
	cleanUpAndExit(isEncryptingDirFlag, zipAlreadyExistedFlag, quotedFileToBeEncrypted)
end encryptFile

-------
-- Main
-------

set encryptedExtension to readValueFromConfig("encryptedFileExtension")

tell application "Finder" to set selected_items to selection
repeat with itemRef in selected_items
	
	-- Get filePath and escape it
	set filePath to POSIX path of (itemRef as string)
	set quotedAndEscapedPath to quoted form of filePath
	log "FilePath: " & filePath
	
	-- Set up cdToRightDir command
	set parentDir to do shell script "dirname " & quotedAndEscapedPath
	log "ParentDir: " & parentDir
	set cdToRightDir to "cd " & quoted form of (parentDir) & " && "
	
	-- Use filetype to figure out if we need to encrypt or decrypt it.
	if getFileType(quotedAndEscapedPath) is equal to "openssl enc'd data with salted password" then
		decryptFile(filePath)
	else
		encryptFile(filePath, parentDir)
	end if
end repeat
