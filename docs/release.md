# Release Process

**UNTESTED**

## Create macOS App

```bash
$ npm run preelectron-pack && npm run dist
```

The macOS installer can be found at `dist/deadbolt-0.1.0-mac.zip`.

## Publish on `npm`

```bash
$ npm version [major / minor / patch]
$ npm publish
```

## Release on GitHub

1. Bump the version number in `package.json`.
2. Commit and push.

```bash
version=$(npm version | rg deadbolt | cut -d ":" -f 2 | sed s/\'//g | sed s/,//g | sed s/\ //g)
hub release create -m "deadbolt v$version" $version
```

## Release on Homebrew



