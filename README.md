# deadbolt 
> Encryption -- so simple your mom can do it.

This tool removes all of the complication of encrypting and decrypting files. Simply select or drop in file you'd like to encrypt, enter a password and you're done. To decrypt, just double click on the file and enter a password.

This app should work on `Linux`, `macOS`, and `Windows`, making it incredibly easy to share encrypted files across different platforms.

This script can encrypt any file. To encrypt directories, compress them beforehand (`.zip`, `.tar.gz`, etc.)

Here's a quick demo:

<h1 align="center">
  <img src="img/demo.gif" width="80%" />
  <br />
</h1>

## Installation

You can install `deadbolt` in a few ways. Choose the one that best suits you.

### Manually Install from GitHub Releases

Download the latest release from the [deadbolt GitHub Releases](https://github.com/alichtman/deadbolt/releases) page.

### Homebrew Install

```bash
$ brew install alichtman/taps/deadbolt
```

### npm Install

```bash
$ npm install -g deadbolt
```

### Manually Instill with git 

```bash
$ git clone https://github.com/alichtman/deadbolt.git
$ cd deadbolt
$ npm run preelectron-pack && npm run dist
$ mv dist/mac/deadbolt.app /Applications/deadbolt.app
```

## Setting `deadbolt` as Default App for `.dbolt` Files on macOS

You can set this app as the default app for `.dbolt` files, which means you'll be able to double-click on `.dbolt` files to open them with `deadbolt` for decryption.

You can set this up the first time you double-click on a `.dbolt` file, or by right-clicking on a `.dbolt` file, selecting `Get Info` and changing the default app in the `Open With:` section.

To do this programmatically, run the following snippet:

```bash
# Set deadbolt as default app for .dbolt files
$ defaults write com.apple.LaunchServices LSHandlers -array-add \
"<dict><key>LSHandlerContentTag</key>
<string>dbolt</string><key>LSHandlerContentTagClass</key>
<string>public.filename-extension</string><key>LSHandlerRoleAll</key>
<string>org.alichtman.deadbolt</string></dict>"

# Restart LaunchServices
$ /System/Library/Frameworks/CoreServices.framework/Versions/A/Framework/LaunchServices.framework/Versions/A/Support/lsregister -kill -domain local -domain system -domain user
```

## Technical Details

 `deadbolt` uses `crypto.js` from the `node.js` standard library for all cryptographic operations. The `AES-256-GCM` cipher. The derived key for the cipher is created using `pbkdf2Sync`, taking in a 64B randomly generated salt and the user generated password, with 10,000 iterations, a 32B key length and `SHA512` digest. The authenticity of the data is verified with the authentication tag provided by using `GCM`.
