# Development Guide

`node v22` is the supported development version. Feel free to upgrade to the latest version of node if you want to!

Currently, [`nvm`](https://github.com/nvm-sh/nvm#nvmrc) is used to manage the node version.

## Running + Debugging

```bash
# Clone project
$ git clone git@github.com:alichtman/deadbolt.git && cd deadbolt

# Set up node version
$ nvm use

# Install dependencies
$ npm install --save

# Install git hooks
$ npm run prepare

# Run in debug mode
$ DEADBOLT_DEBUG=1 npm run start

# Run in production mode
$ npm run start
```

- Check the Chrome DevTools and electron server consoles for debug logs.

## Icons

Icons don't work in the dev environment, but they do work if you build a release.

```bash
$ npm run package
```
