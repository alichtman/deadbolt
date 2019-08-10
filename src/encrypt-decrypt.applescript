-- Easy File/Folder Encryption and Decryption with openssl
-- Written by: Aaron Lichtman <aaronlichtman@gmail.com>

----------------------
-- Globals / Constants
----------------------

global encryptedExtension
set encryptedExtension to ".encrypted"
global missingOpenSSLError
set missingOpenSSLError to "Error: openssl can't be found on your system. Make sure it's installed and on your $PATH."
global cdToRightDir

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

on userExit()
	error number -128
end userExit

-- Make sure openssl is installed.
on checkOpenSSLInstallation()
	try
		do shell script "which openssl"
	on error
		log missingOpenSSLError
		display dialog missingOpenSSLError
		userExit()
	end try
end checkOpenSSLInstallation

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

-- Removes zip archive if we created it and then exits
on cleanUpAndExit(isEncryptingDir, zipAlreadyExistedFlag, zipPath)
	log "Cleaning up and exiting."
	if isEncryptingDir and not zipAlreadyExistedFlag then
		removeFile(zipPath)
	end if
	userExit()
end cleanUpAndExit

-- Returns the SHA1 sum of the filePath passed in
on hashFile(filePath)
	log "Hashing: " & filePath
	return do shell script cdToRightDir & "openssl sha1 " & filePath & " | cut -d' ' -f2"
end hashFile

-- Prompt for passphrase, enter it and verify decryption. If it's a ZIP, auto-extract and delete ZIP.
on decryptFile(filePath)
	log "Decrypting: " & filePath
	set decryptionKey to the text returned of (display dialog "Enter a decryption password:" default answer "")
	-- Extract file hash from filename for decryption success verification
	set originalHash to do shell script "echo " & filePath & " | rev | cut -d'.' -f 2 | rev"
	log "Original Hash: " & originalHash
	set unencryptedFilePath to quoted form of findAndReplaceInText(filePath, "." & originalHash & encryptedExtension, "")
	--  Detect decryption failures with a checksum (#1) At the moment, we are printing success every single time, even when the password is incorrect.
	log "openssl enc -d -aes-256-ctr -salt -in " & quoted form of filePath & " -out " & unencryptedFilePath & " -pass pass:" & decryptionKey
	do shell script "openssl enc -d -aes-256-ctr -salt -in " & quoted form of filePath & " -out " & unencryptedFilePath & " -pass pass:" & decryptionKey

	if hashFile(unencryptedFilePath) is not equal to originalHash then
		log "ERROR: Decryption failure for file: " & filePath
		display dialog "ERROR: Decryption failure for file: " & filePath
		do shell script cdToRightDir & "rm " & unencryptedFilePath
		return
	else
		log "Successful decryption!"
		display dialog "Successful decryption!"
	end if

	-- If it's a zip, auto decompress it and remove the zip
	set decryptedFileType to do shell script cdToRightDir & "file " & unencryptedFilePath & " | sed 's/^.*: //' | cut -d' ' -f1"
	log "Decrypted File Type: " & decryptedFileType
	if decryptedFileType is equal to "Zip" then
		do shell script cdToRightDir & " unzip -u " & unencryptedFilePath
		removeFile(unencryptedFilePath)
	end if
end decryptFile

-------
-- Main
-------

checkOpenSSLInstallation()

tell application "Finder" to set selected_items to selection
repeat with itemRef in selected_items
	set filePath to POSIX path of (itemRef as string)
	set quotedAndEscapedPath to quoted form of findAndReplaceInText(filePath, " ", "\\\\")
	log "FilePath: " & filePath
	set parentDir to do shell script "dirname " & quotedAndEscapedPath
	log "ParentDir: " & parentDir
	set fileType to do shell script "file " & quotedAndEscapedPath & " | sed 's/^.*: //'"
	log "Filetype: " & fileType
	set cdToRightDir to "cd " & quoted form of (parentDir) & " && "

	-- If file is already encrypted, decrypt it.
	if fileType is equal to "openssl enc'd data with salted password" then
		decryptFile(filePath)
	else
		-- If it's not already encrypted, encrypt it.
		set fileToBeEncrypted to filePath
		set zipAlreadyExistedFlag to false
		set isEncryptingDir to false

		-- If the filePath is a folder, compress it into a zip file.
		if kind of (info for filePath) is "folder" then
			set isEncryptingDir to true
			log "Encrypting Directory."
			set dirToBeZipped to findAndReplaceInText(text 1 through -2 of filePath, parentDir & "/", "")
			log "DirToBeZipped: " & dirToBeZipped
			log "Created: " & fileToBeEncrypted
			log "cdToRightDir: " & cdToRightDir
			set fileToBeEncrypted to dirToBeZipped & ".zip"
			set quotedFileToBeEncrypted to quoted form of (fileToBeEncrypted)
			set zipAlreadyExistedFlag to checkIfFileExists(quotedFileToBeEncrypted)
			set zipCommand to cdToRightDir & "zip -r " & quotedFileToBeEncrypted & " " & quoted form of (dirToBeZipped & "/")
			log "Zip Command: " & zipCommand
			do shell script zipCommand
		end if

		set encryptedFileName to fileToBeEncrypted & "." & hashFile(fileToBeEncrypted) & encryptedExtension

		-- TODO: Remove ZIP if user exits at either of these prompts
		set encryptionKey to the text returned of (display dialog "Enter an encryption password for file: " & fileToBeEncrypted default answer "")
		set encryptionKeyConfirmation to the text returned of (display dialog "Enter the password again: " default answer "")

		if encryptionKey is not equal to encryptionKeyConfirmation then
			display dialog "ERROR: Encryption passwords did not match."
			log "ERROR: Passwords didn't match"
			return
		end if

		log "Encryption Command: openssl enc -aes-256-ctr -salt -in " & fileToBeEncrypted & " -out " & encryptedFileName & " -pass pass:" & encryptionKey
		do shell script cdToRightDir & "openssl enc -aes-256-ctr -salt -in " & fileToBeEncrypted & " -out " & encryptedFileName & " -pass pass:" & encryptionKey
		display dialog "Created " & encryptedFileName
		cleanUpAndExit(isEncryptingDir, zipAlreadyExistedFlag, fileToBeEncrypted)
	end if
end repeat
