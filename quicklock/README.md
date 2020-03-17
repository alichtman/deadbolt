# QuickLock
> Bringing the simplistic style of Quick Look's file browsing to encryption.
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

You can install `QuickLock` in a few ways. Choose the one that best suits you.

### Manually Install from GitHub Releases

Download the latest release from the [QuickLock GitHub Releases](https://github.com/alichtman/quicklock/releases) page.

### Homebrew Install

```bash
$ brew cask install quicklock
```

### npm Install

```bash
$ npm install -g quicklock
```

### Manually Instill with git 

```bash
$ git clone https://github.com/alichtman/quicklock.git
$ cd quicklock
$ npm run preelectron-pack && npm run dist
$ mv dist/mac/quicklock.app /Applications/quicklock.app
```

## Setting `QuickLock` as Default App for `.qlock` Files on macOS

You can set this app as the default app for `.qlock` files, which means you'll be able to double-click on `.qlock` files to open them with `QuickLock` for decryption.

You can set this up the first time you double-click on a `.qlock` file, or by right-clicking on a `.qlock` file, selecting `Get Info` and changing the default app in the `Open With:` section.

To do this programmatically, run the following snippet:

```bash
# Set QuickLock as default app for .qlock files
$ defaults write com.apple.LaunchServices LSHandlers -array-add \
"<dict><key>LSHandlerContentTag</key>
<string>qlock</string><key>LSHandlerContentTagClass</key>
<string>public.filename-extension</string><key>LSHandlerRoleAll</key>
<string>org.alichtman.quicklock</string></dict>"

# Restart LaunchServices
$ /System/Library/Frameworks/CoreServices.framework/Versions/A/Framework/LaunchServices.framework/Versions/A/Support/lsregister -kill -domain local -domain system -domain user
```

## Usage Notes


## Technical Details

This script uses `openssl`'s implementation of the [`AES 256`](https://csrc.nist.gov/csrc/media/publications/fips/197/final/documents/fips-197.pdf) encryption algorithm in [Counter](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation#Counter_(CTR)) (`CTR`) mode, as is recommended in Professor Rogaway's [_Evaluation of Some Blockcipher Modes of Operation_](https://web.cs.ucdavis.edu/~rogaway/papers/modes.pdf). This algorithm is part of the NSA's [Commercial National Security Algorithm Suite](https://apps.nsa.gov/iaarchive/programs/iad-initiatives/cnsa-suite.cfm) and is approved to protect up to TOP SECRET documents.

This script uses the `openssl` `-salt`  option. This makes [Rainbow Table attacks](https://en.wikipedia.org/wiki/Rainbow_table) impractical, however, it also means that if you encrypt a file and forget the password -- that's game. Nobody can recover that file. Back up your passphrases!
