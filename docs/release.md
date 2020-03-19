# Release Process

`deadbolt` is distributed in four ways. Three of these are managed in the `scripts/release.sh` script. `Homebrew` is managed manually.

## TL;DR

`$ ./scripts/release.sh` and then do the Homebrew stuff.

## Create macOS App

```bash
$ npm run preelectron-pack && npm run dist
```

The macOS installer can be found at `dist/deadbolt-x.y.z-mac.zip`.

## Publish on `npm`

```bash
$ npm version [major / minor / patch]
$ npm publish
```

## Release on GitHub

1. Bump the version number in `package.json`.
2. Commit and push.
3. `$ ./scripts/github-release.sh`

## Release on Homebrew



