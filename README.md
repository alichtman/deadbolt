# deadbolt

<img src="img/deadbolt-header.png" />

`deadbolt` simplifies encrypting and decrypting files. All you need is a password.

Select a file (or folder) to encrypt, enter a password, and … that’s it. Decryption is just as easy.

You can download `deadbolt` for **macOS**, **Windows**, or **Linux**. Any encrypted file can be shared across these platforms.

## Building / Installing

Check out the [releases tab](https://github.com/alichtman/deadbolt/releases) for pre-built binaries for Mac, Windows, and Linux.

### `macOS`

If you're running `macOS`, install `deadbolt` from [GitHub Releases](https://github.com/alichtman/deadbolt/releases).

If you have an Mac with an M-series chip, the `arm64` version is recommended. If you're not sure, the `x86_64` version will work on all Macs, but be extremely slow.

You can also install `deadbolt` using `brew`, however, [the recipe](https://github.com/Homebrew/homebrew-cask/blob/master/Casks/d/deadbolt.rb) may not be up-to-date.

```bash
$ brew install --cask deadbolt
```

### Windows

Download an `.exe` file, or installer, from [GitHub Releases](https://github.com/alichtman/deadbolt/releases).

### Linux

`AppImage` and `flatpak` packages are available for Linux. `AppImages` can run on all major Linux desktop distributions, and `flatpak` packages are provided as another option. Auto-updates are not supported for Linux currently.

<!-- TODO: Add reference to flathub once I get that published [Flathub](https://flathub.org/apps/details/org.alichtman.deadbolt)-->

#### Building `flatpak` package from source

```bash
deadbolt on main is 📦 v2.0.0-beta via node v22.11.0 took 0s
$ npm run package:linux-flatpak

deadbolt on main is 📦 v2.0.0-beta via node v22.11.0
09:47:52 PM ➜ ll release/build/
...
.rw-r--r--. alichtman alichtman  75 MB Sat Feb  8 21:42:00 2025 Deadbolt-2.0.0-beta.x86_64.flatpak

deadbolt on main is 📦 v2.0.0-beta via node v22.11.0 took 0s
09:48:23 PM ➜ flatpak install --user release/build/Deadbolt-2.0.0-beta.x86_64.flatpak

org.alichtman.deadbolt permissions:
    ipc   wayland   x11   dri   file access [1]

    [1] home


        ID                               Branch           Op           Remote                   Download
 1. [✓] org.alichtman.deadbolt           master           i            deadbolt-origin          0 bytes

Installation complete.

deadbolt on main is 📦 v2.0.0-beta via node v22.11.0 took 7s
09:48:42 PM ➜ flatpak run org.alichtman.deadbolt
```

#### Arch

`deadbolt` is [packaged as `deadbolt-bin` on `aur`](https://aur.archlinux.org/packages/deadbolt-bin). I do not maintain this package, so use at your own risk.

```bash
$ yay -S deadbolt-bin
```

## How it Works

### Non-Technical Version

`deadbolt` uses a proven, secure encryption algorithm to make sure your files stay safe.

### Technical Version

`deadbolt` is built on Electron and uses `crypto.js` from the `node.js` standard library. The encryption protocol used is `AES-256-GCM`. This algorithm is part of the NSA's [Commercial National Security Algorithm Suite](https://apps.nsa.gov/iaarchive/programs/iad-initiatives/cnsa-suite.cfm) and is approved to protect up to TOP SECRET documents. A 256-bit derived key for the cipher is created using 11,000 iterations of `pbkdf2` with the `SHA-512 HMAC` digest algorithm, a 64-byte randomly generated salt, and a user generated password. The authenticity of the data is verified with the authentication tag provided by using GCM. These parameters were chosen by following the [NIST Guidelines for `pbkdf2`](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf).

## Security Review

The cryptography components of `deadbolt` were written by an ex-Facebook Security Engineer ([@alichtman](https://github.com/alichtman) -- me), and have been briefly reviewed by [Vlad Ionescu](https://github.com/vladionescu), an ex-Facebook tech lead from the Red Team / Offensive Security Group. Their review is:

> "yeah fuck it, it's fine. You're using very boring methods for everything -- that's the way to do it"

## FAQ

### Showing Extensions on `macOS`

By default, `macOS` hides file extensions. To reduce confusion about what type each file is, I recommend configuring `macOS` to show file extensions. You can do that with the following command: `$ defaults write NSGlobalDomain AppleShowAllExtensions -bool true && killall Finder`.

### Setting `deadbolt` as Default App for `.deadbolt` Files on macOS

You can set this app as the default app for `.deadbolt` files, which means you'll be able to double-click on `.deadbolt` files to open them with `deadbolt` for decryption.

You can set this up the first time you double-click on a `.deadbolt` file, or by right-clicking on a `.deadbolt` file, selecting `Get Info` and changing the default app in the `Open With:` section.

To do this programmatically, run the following snippet:

```bash
$ brew install duti
$ duti -s org.alichtman.deadbolt dyn.ah62d4rv4ge80k2xtrv4a all
```

The output of `$ duti -x deadbolt` should then be:

```bash
$ duti -x deadbolt
Deadbolt.app
/Applications/Deadbolt.app
org.alichtman.deadbolt
```
