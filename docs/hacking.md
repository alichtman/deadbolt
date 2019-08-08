## Hacking

### Writing Code

The master copy of this project is `encrypt-decrypt.applescript`, but `Encrypt\ Decrypt.workflow` is the file that is released / installed by users.

### Testing

Test by selecting a file in Finder and running the script with `$ osascript encrypt-decrypt.applescript`.

### Making a New Release

1. Copy the `encrypt-decrypt.applescript` file into the `Encrypt\ Decrypt.workflow` file and export the workflow.
2. Copy the `encrypt-decrypt.applescript` file into the `Encrypt\ Decrypt.app` file and export the workflow.
3. Run script to update the app icon.
4. Bump the version number in `VERSION`.
5. Commit and push
