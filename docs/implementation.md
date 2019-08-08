## Implementation Overview

- Iterate over all selected items in Finder
- Check `$ file` output to decide whether to encrypt or decrypt file
- If decrypting:
	* Prompt for password and decrypt
- If encrypting:
    * If encrypting a directory, create a ZIP archive of it in the same directory it lives in.
	* Prompt for password and verify it's correct
	* Encrypt the ZIP (if it's a directory) or regular file
	* Remove ZIP archive if it should be removed
