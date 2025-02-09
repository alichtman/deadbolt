# Building and Releasing `deadbolt`

## Types of Builds

### Dev Builds

On macOS, you can build for macOS and Windows.
On Linux, you can build for AppImage, Flatpak. Snap, deb, and RPM would be great to support, but I couldn't get it working.

### Production Builds

All of the production builds are done in CI with GitHub Actions. See the [build.yml](../.github/workflows/build.yml) workflow for details.

## Building Executables

There is a collection of `$ npm run package:*` scripts that build the app for each platform. See the [package.json](../package.json) for details. To try to package everything locally, run:

```bash
$ npm install
$ npm run package
```

## Release Process

`deadbolt` is built for macOS, Linux, and Windows, and a bunch of different architectures. It's distributed in a few ways.

1. GitHub Releases
2. Homebrew
3. Flatpak
4. AppImage

## TL;DR

Bump the version in [package.json](../package.json) and run `$ npm run release`. A draft release will be created in GitHub, and CI will populate the build artifacts.

```
$ npm run release
```

Then, upload to Flathub, aur, and homebrew. Update the URLs in the [Homebrew taps repo](https://www.github.com/alichtman/homebrew-taps).
Eventually, would be nice to support snap, dnf copr, and deb builds.

## Release on Homebrew

1. Update URLs in [Homebrew taps repo](https://github.com/alichtman/homebrew-taps/blob/master/deadbolt.rb)
