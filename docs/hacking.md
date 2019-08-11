# Hacking

### How Does This Work?

- `quick-lock.applescript` file is the master script. When I am developing, I write code in this file.
- `dist/Quick Lock.app` is an app I created in Automator that runs a copy of the script above. This allows you to choose the option to open `.encrypted` filetypes with it, meaning that you can double-click on encrypted files to decrypt them.
- `dist/Quick Lock.workflow` is a Quick Action created in Automator that allows you to right-click on files and select the option to encrypt / decrypt them.
- `install.sh` copies over an icon file and a set-file-icon script, which are used to update the look of encrypted files when we create them.

### Writing Code

The master copy of this project is `quick-lock.applescript`, but the files in `dist/` are the ones that are actually installed by users.

### Testing

Test by selecting a file in Finder and running the script with `$ osascript quick-lock.applescript`.

### Making a New Release

1. Copy the `quick-lock.applescript` file into the `Quick\ Lock.workflow` file and export the workflow, signing with `Aaron Lichtman`'s signing certificate.
2. Copy the `quick-lock.applescript` file into the `Quick\ Lock.app` file and export the app, signing with `Aaron Lichtman`'s signing certificate.
3. Bump the version number in `VERSION`.
5. Commit and push.
4. Draft a new release on GitHub.
