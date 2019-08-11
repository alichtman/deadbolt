# Hacking

### How Does This Work?

- `encrypt-decrypt.applescript` file is the master script. When I am developing, I write code in this file.
- `dist/Encrypt Decrypt.app` is an app I created in Automator that runs a copy of the script above. This allows you to choose the option to open `.encrypted` filetypes with it, meaning that you can double-click on encrypted files to decrypt them.
- `dist/Encrypt Decrypt.workflow` is a Quick Action created in Automator that allows you to right-click on files and select the option to encrypt / decrypt them.
- `install.sh` copies over an icon file and a set-file-icon script, which are used to update the look of encrypted files when we create them.

### Writing Code

The master copy of this project is `encrypt-decrypt.applescript`, but the files in `dist/` are the ones that are actually installed by users.

### Testing

Test by selecting a file in Finder and running the script with `$ osascript encrypt-decrypt.applescript`.

### Making a New Release

1. Copy the `encrypt-decrypt.applescript` file into the `Encrypt\ Decrypt.workflow` file and save the workflow.
2. Copy the `encrypt-decrypt.applescript` file into the `Encrypt\ Decrypt.app` file and save the app.
3. Bump the version number in `VERSION`.
4. Tag the commit as a new release
5. Push
