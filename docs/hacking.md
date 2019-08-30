# Hacking

### How Does This Work?

- The `quick-lock.applescript` file is the master script. When I am developing, I write code in this file.
- `dist/Quick Lock.app` is an app I created in Automator that runs a copy of the script above. This allows you to choose the option to open `.encrypted` filetypes with it, meaning that you can double-click on encrypted files to decrypt them.
- `dist/Quick Lock.workflow` is a Quick Action created in Automator that allows you to right-click on files and select the option to encrypt / decrypt them.
- `install.sh` copies over an icon file and a `set-file-icon` script, which are used to update the look of encrypted files when we create them.

### Writing Code

The master copy of this project is `quick-lock.applescript`, but the files in `dist/` are the ones that are actually installed by users.

### Testing

Test by selecting a file in Finder and running the script with `$ osascript quick-lock.applescript`.

### Making a New Release

In order to make a new release, until [the new structure is finalized](https://github.com/alichtman/macOS-quick-lock/issues/28), here is what needs to be done:

1. Open `Quick\ Lock.workflow` in Automator, copy the updated `quick-lock.applescript` file into the script box and save it. Note that official releases must be signed with `Aaron Lichtman`'s certificate.
2. Do the same for the `Quick\ Lock.app`.
3. Bump the version number in `VERSION`.
4. Commit and push.
5. $ hub release create -m "MESSAGE" `cat VERSION`
