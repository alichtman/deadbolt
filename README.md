# deadbolt

<img src="img/deadbolt-header.png" />

`deadbolt` simplifies encrypting and decrypting files. All you need is a password.

Select a file to encrypt, enter a password, and … that’s it. Decryption is just as easy.

You can download `deadbolt` for **Mac OS**, **Windows**, or **Linux**. Any encrypted file can be shared across these platforms.

> Note: `deadbolt` can not encrypt directories. To encrypt a directory, compress it into a `.zip` (or any archive format) file before using `deadbolt`.

## Installation

If you're running **Mac OS**, install `deadbolt` with Homebrew:

```bash
$ brew install --cask deadbolt
```

If you're running **Windows** or **Linux**, download the latest release [here.](https://github.com/alichtman/deadbolt/releases)

### Ubuntu / Debian

First try:

```bash
$ sudo apt install deadbolt_1.0.0_amd64.deb
```

but if `apt` suggests removing `ubuntu-desktop`, etc, use:

```bash
$ sudo apt install deadbolt_1.0.0_amd64.deb --no-install-recommends
```

### Arch

`deadbolt` is [packaged as `deadbolt-bin` on aur](https://aur.archlinux.org/packages/deadbolt-bin).

```bash
$ yay -S deadbolt-bin
```

## How it Works

### Non-Technical Version

`deadbolt` uses a proven, secure encryption algorithm to make sure your files stay safe.

### Technical Version

`deadbolt` is built on Electron and uses `crypto.js` from the `node.js` standard library. The encryption protocol used is `AES-256-GCM`. This algorithm is part of the NSA's [Commercial National Security Algorithm Suite](https://apps.nsa.gov/iaarchive/programs/iad-initiatives/cnsa-suite.cfm) and is approved to protect up to TOP SECRET documents. A 256-bit derived key for the cipher is created using 11,000 iterations of `pbkdf2` with the `SHA-512` HMAC digest algorithm, a 64-byte randomly generated salt, and a user generated password. The authenticity of the data is verified with the authentication tag provided by using GCM. These parameters were chosen by following the [NIST Guidelines for pbkdf2](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf).

## Security Review

The cryptography components of `deadbolt` were written by an ex-Facebook Security Engineer ([@alichtman](https://github.com/alichtman) -- me), and have been briefly reviewed by [Vlad Ionescu](https://github.com/vladionescu), an ex-Facebook tech lead from the Red Team / Offensive Security Group. Their review is:

> "yeah fuck it, it's fine. You're using very boring methods for everything -- that's the way to do it"

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
