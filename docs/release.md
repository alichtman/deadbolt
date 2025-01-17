# Building and Releasing `deadbolt`

The only successful path is building and releasing on macOS. You can't compile the macOS builds on Linux, and I won't develop on Windows.

## Building Executables

```bash
$ npm run package
```

## Release Process

`deadbolt` is built for macOS, Linux, and Windows, and a bunch of different architectures. It's distributed in a few ways.

1. GitHub Releases
2. Homebrew
3. Flatpak
4. Snap
5. AppImage
6. RPM
7. DEB

## TL;DR

```
$ npm run release
```

// TODO: Then, some more work needs to be done -- upload to Flathub, snap, dnf copr, aur, and homebrew. Update the URLs in the [Homebrew taps repo](https://www.github.com/alichtman/homebrew-taps).

## Release on Homebrew

1. Update URLs in [Homebrew taps repo](https://github.com/alichtman/homebrew-taps/blob/master/deadbolt.rb)
