### These docs are outdated.

See: https://electron-react-boilerplate.js.org/docs/packaging

# Release Process

`deadbolt` is distributed in two ways.

1. GitHub Releases
2. Homebrew

## TL;DR

`$ ./scripts/release.sh` and then update the URLs in the [Homebrew taps repo](https://www.github.com/alichtman/homebrew-taps).

## Create macOS App

```bash
$ npm run preelectron-pack && npm run dist
```

The macOS installer can be found at `dist/deadbolt-x.y.z-mac.zip`.

## Release on GitHub

1. Bump the version number in `package.json`.
2. Commit and push.
3. `$ ./scripts/github-release.sh`

## Release on Homebrew

1. Update URLs in [Homebrew taps repo](https://github.com/alichtman/homebrew-taps/blob/master/deadbolt.rb)
