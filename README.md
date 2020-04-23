<h1 align="center">
  <img src="img/deadbolt-header.png" width="80%" />
  <br />
</h1>

> Because encryption shouldn't be so hard.

`deadbolt` removes all of the complication of encrypting and decrypting files. Select a file you'd like to encrypt, enter a password and... that's it. Decrypting the file is as easy as entering the password.

`deadbolt` is built to work on `Linux`, `macOS`, and `Windows`, meaning that you can share encrypted files across platforms.

`deadbolt` can encrypt any file. To encrypt directories, compress them beforehand (`.zip`, `.tar.gz`, etc.)

## Installation

There are two recommended ways to install `deadbolt`.

### Homebrew (Recommended for `macOS`)

```bash
$ brew cask install alichtman/taps/deadbolt
```

### GitHub Releases (Recommended for `Linux` and `Windows`)

Download the latest release from the [deadbolt GitHub Releases](https://github.com/alichtman/deadbolt/releases) page.

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

 `deadbolt` uses `AES-256-GCM` as the encryption algorithms from `crypto.js` in the `node.js` standard library. The derived key for the cipher is created using 10,000 iterations of `pbkdf2Sync`, taking in a 64B randomly generated salt, the user generated password, a 32B key length and `SHA512` digest. The authenticity of the data is verified with the authentication tag provided by using `GCM`.
