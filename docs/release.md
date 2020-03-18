# Release Process

```bash
$ npm run preelectron-pack && npm run dist
```

### Making a New Release

1. Bump the version number in `package.json`.
2. Commit and push.
3. $ hub release create -m "MESSAGE" `cat VERSION`
