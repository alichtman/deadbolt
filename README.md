<h1 align="center">
  <img src="img/deadbolt-header.png" width="80%" />
  <br />
</h1>

> Encryption -- so simple your mom can do it.

`deadbolt` removes all of the complication of encrypting and decrypting files. Select a file you'd like to encrypt, enter a password and... that's it. Decrypting the file is as easy as entering the password.

`deadbolt` is built to work on `Linux`, `macOS`, and `Windows`, meaning that you can share encrypted files across platforms.

`deadbolt` can encrypt any file. To encrypt directories, compress them beforehand (`.zip`, `.tar.gz`, etc.)

## Installation

There are three ways to install `deadbolt`.

### Homebrew (Recommended)

If you're on `macOS`, `Linux` or `Windows` (with `WSL`), this is the recommended installation method. The `Homebrew` formula will install the latest version for your OS.

```bash
$ brew install alichtman/taps/deadbolt
```

### GitHub Releases

Download the latest release from the [deadbolt GitHub Releases](https://github.com/alichtman/deadbolt/releases) page.


### git 

```bash
$ git clone https://github.com/alichtman/deadbolt.git
$ cd deadbolt
$ npm run preelectron-pack && npm run dist
# macOS installation
$ mv dist/mac/Deadbolt.app /Applications/Deadbolt.app
```

## FAQ

### Showing Extensions on `macOS`

By default, `macOS` hides file extensions. To reduce confusion about what type each file is, I recommend configuring `macOS` to show file extensions. You can do that with the following command: `$ defaults write NSGlobalDomain AppleShowAllExtensions -bool true && killall Finder`.

### Setting `deadbolt` as Default App for `.dbolt` Files on macOS

You can set this app as the default app for `.dbolt` files, which means you'll be able to double-click on `.dbolt` files to open them with `deadbolt` for decryption.

You can set this up the first time you double-click on a `.dbolt` file, or by right-clicking on a `.dbolt` file, selecting `Get Info` and changing the default app in the `Open With:` section.

To do this programmatically, run the following snippet:

```bash
$ brew install duti
$ duti -s org.alichtman.deadbolt dyn.ah62d4rv4ge80k2xtrv4a all
```

The output of `$ duti -x dbolt` should then be:

```bash
$ duti -x dbolt
Deadbolt.app
/Applications/Deadbolt.app
org.alichtman.deadbolt
```

## Technical Details

 `deadbolt` uses `crypto.js` from the `node.js` standard library for all cryptographic operations. `AES-256-GCM` is the default encryption algorithm used. The derived key for the cipher is created using `pbkdf2Sync`, taking in a 64B randomly generated salt and the user generated password, with 10,000 iterations, a 32B key length and `SHA512` digest. The authenticity of the data is verified with the authentication tag provided by using `GCM`.
