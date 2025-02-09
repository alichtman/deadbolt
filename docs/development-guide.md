# Development Guide

## Running + Debugging

```bash
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
