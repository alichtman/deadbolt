-- Easy File/Folder Encryption and Decryption with openssl
-- Written by: Aaron Lichtman <aaronlichtman@gmail.com>

-----------
-- Overview:
-----------
	-- Iterate over all selected items
	-- Check $ file output to decide whether to encrypt or decrypt file
	-- If encrypting:
		-- If encrypting a directory, create a ZIP archive of it in the same directory it lives in.
		-- Prompt for password
		-- Encrypt the ZIP (if it's a directory) or regular file
		-- Clean up temp ZIP archive, if it exists
	-- If decrypting:
		-- Prompt for password
		-- Decrypt
	-- Prompt user for password

------------
-- Globals / Constants
------------

set encryptedExtension to ".encrypted"
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

-- Make sure openssl is installed.
on checkOpenSSLInstallation()
	try
		do shell script "which openssl"
	on error
		display dialog "Encrypt/Decrypt Error: openssl can't be found on your
						system. Make sure it's installed and on your $PATH."
		return
	end try
end checkOpenSSLInstallation

-- Check if file exists. Returns true if it does
on checkIfFileExists(path)
	log cdToRightDir & "test -e " & path
	try
		do shell script cdToRightDir & "test -e " & path
	on error
		return false
	end try
	return true
end checkIfFileExists

on removeZip(zipPath)
		log "Removing zip archive: " & zipPath
		do shell script cdToRightDir & "rm " & quoted form of zipPath
end removeZip

-------
-- Main
-------

checkOpenSSLInstallation()

tell application "Finder" to set selected_items to selection
repeat with itemRef in selected_items
	set filePath to POSIX path of (itemRef as string)
	log "FilePath: " & filePath

	set fileType to do shell script "file " & filePath & " | sed 's/^.*: //'"
	log "FileType: " & fileType

	-- If file is already encrypted, decrypt it.
	if fileType is equal to "openssl enc'd data with salted password" then
		set decryptionKey to the text returned of (display dialog "Enter a decryption password for: " & filePath default answer "")
		set unencryptedFilePath to findAndReplaceInText(filePath, encryptedExtension, "")

		--  TODO: Detect decryption failures with a checksum (#1)
		do shell script "openssl enc -d -aes-256-ctr -salt -in " & filePath & " -out " & unencryptedFilePath & " -pass pass:" & decryptionKey
		set checksumDoesNotMatch to false
		if checksumDoesNotMatch then
			display dialog "ERROR: Decryption failure for file: " & filePath
			return
		else
			display dialog "Successful decryption! Decrypted file can be found at: " & unencryptedFilePath
		end if

		-- TODO: If it's a zip, auto decompress it and remove the zip. (#2)
	else
		-- If it's not already encrypted, encrypt it.
		set fileToBeEncrypted to filePath
		set zipAlreadyExistedFlag to false
		set parentDir to do shell script "dirname " & filePath
		set cdToRightDir to "cd " & quoted form of (parentDir) & " && "
		set isEncryptingDir to false

		-- If the filepath is a folder, compress it into a zip file.
		if kind of (info for filePath) is "folder" then
			set isEncryptingDir to true
			log "Encrypting Directory..."
			log "ParentDir: " & parentDir
			log "Created: " & fileToBeEncrypted
			set dirToBeZipped to findAndReplaceInText(text 1 through -2 of filePath, parentDir & "/", "")
			log "DirToBeZipped: " & dirToBeZipped
			log "cdToRightDir: " & cdToRightDir
			set fileToBeEncrypted to dirToBeZipped & ".zip"
			set quotedFileToBeEncrypted to quoted form of (fileToBeEncrypted)
			set zipAlreadyExistedFlag to checkIfFileExists(quotedFileToBeEncrypted)
			set zipCommand to cdToRightDir & "zip -r " & quotedFileToBeEncrypted & " " & quoted form of (dirToBeZipped & "/")
			log "Zip Command: " & zipCommand
			do shell script zipCommand
		else
			display dialog fileToBeEncrypted & " is a file."
		end if

		-- Test to see if the encrypted file we're about to create already exists, and warn user. https://stackoverflow.com/a/3471702
		-- If the user says the don't want to overwrite, remove the ZIP archive if we created it and then exit
		set encryptedFileName to fileToBeEncrypted & encryptedExtension
		if checkIfFileExists(encryptedFileName) then
			set shouldOverwrite to button returned of (display dialog encryptedFileName & " already exists. Would you like to overwrite it?" buttons {"No", "Yes"} default button "Yes")
			if shouldOverwrite is equal to "No" then
				if isEncryptingDir and not zipAlreadyExistedFlag then
					removeZip(fileToBeEncrypted)
				end if
				return
			end if
		end if

		set encryptionKey to the text returned of (display dialog "Enter an encryption password for file: " & encryptedFileName default answer "")
		set encryptionKeyConfirmation to the text returned of (display dialog "Enter the password again: " default answer "")

		if encryptionKey is not equal to encryptionKeyConfirmation then
			display dialog "ERROR: Encryption passwords did not match."
			return
		end if

		do shell script cdToRightDir & "openssl enc -aes-256-ctr -salt -in " & fileToBeEncrypted & " -out " & encryptedFileName & " -pass pass:" & encryptionKey
		display dialog "Created: " & encryptedFileName

		if isEncryptingDir and not zipAlreadyExistedFlag then
			removeZip(fileToBeEncrypted)
		end if
	end if
end
