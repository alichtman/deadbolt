# Deadbolt — Agent Guide

Dead-simple cross-platform file encryption (AES-256-GCM + Argon2id) with an Electron GUI and a
standalone CLI. Written in TypeScript.

## Commands

| Task | Command |
|------|---------|
| Run all tests | `npm test` |
| Lint | `npm run lint` |
| Lint + fix | `npm run lint:fix` |
| Dev (Electron) | `npm start` |
| Build CLI | `npm run build:cli` |
| Build (prod) | `npm run build` |
| Package release | `npm run package` |
| Sync versions | `npm run update-versions` |

## Architecture

```
src/main/          Electron main process + core encryption library
src/cli/           CLI entry point (commander.js) → compiled to dist/deadbolt-cli.js
src/renderer/      React UI (MUI + react-dropzone)
src/__tests__/     Jest tests (unit + E2E)
.erb/configs/      Webpack configs (main, renderer, CLI, DLLs)
.erb/scripts/      Build & test helper scripts
release/app/       Nested npm package — holds native dependencies only
dist/              Compiled CLI output (dist/deadbolt-cli.js)
```

**Key source files:**

| File | Purpose |
|------|---------|
| `src/main/encryptionAndDecryptionLib.ts` | All encrypt/decrypt/KDF logic |
| `src/main/fileUtils.ts` | Path validation, extension handling, encrypted-file detection |
| `src/cli/index.ts` | CLI commands, password prompting |
| `src/main/main.ts` | Electron IPC handlers |
| `src/main/logger.ts` | Logging (electron-log in GUI, chalk in CLI) |
| `src/main/error-types/` | Six custom error classes |

## Testing

Three test suites, all under `src/__tests__/`:

- `encryption-lib.test.ts` — unit tests (imports lib directly)
- `cli.e2e.test.ts` — E2E tests via `execSync` against `dist/deadbolt-cli.js`
- `format-versions-cli.e2e.test.ts` — V001/V002 backwards-compatibility E2E

The global setup (`jest-global-setup.ts`) rebuilds the CLI bundle before any E2E test runs.

**Test fixtures** live in `src/__tests__/test_data/` (pre-encrypted V001 and V002 images, ~5 MB each).

## Critical Gotchas

### 1. Native deps live in `release/app/`, NOT root `node_modules`

`@node-rs/argon2` is a native module. webpack can't bundle it. It is installed in
`release/app/node_modules` (the Electron app sub-package). **Never** add it to root dependencies.
`check-native-dep.js` enforces this on every `npm install`.

**How the CLI finds it at runtime:**
- `webpack.config.cli.ts` lists it as `externals`, so webpack emits a plain `require('@node-rs/argon2')` instead of bundling the code
- The compiled `dist/deadbolt-cli.js` has a **prepended banner** (first thing that runs) that pushes `release/app/node_modules` into Node's `module.paths`
- When the `require()` fires, Node resolves it there

**How Jest finds it:**
- `moduleDirectories` in jest config includes `release/app/node_modules`

To add a new native dep:
```bash
# Wrong: npm install @foo/native
# Right:
cd release/app && npm install @foo/native
```

### 2. DEADBOLT_ARGON2_TEST_PARAMS=1 for fast tests

Production Argon2id uses 2 GiB RAM per hash (RFC 9106 FIRST). Each `encryptFile` call does **two**
hashes (encrypt + post-encryption verify); each `decryptFile` does one. Without the test flag,
the suite takes ~65 s.

`jest-setup-argon2.ts` sets `DEADBOLT_ARGON2_TEST_PARAMS=1` automatically before every test run,
switching to 64 KiB / 1 iter / 1 lane. The env var is read at module load time in
`encryptionAndDecryptionLib.ts` via the `ARGON2_TEST_MODE` constant.

CLI e2e tests spawn subprocesses via `execSync` — the child processes inherit the env var and also
use lightweight params.

### 3. Electron IPC cannot serialize custom Error objects

`encryptFile` and `decryptFile` return **strings** prefixed with
`"ERROR_FROM_ELECTRON_MAIN_THREAD: "` instead of throwing. The renderer checks:
```typescript
if (result.startsWith(ERROR_MESSAGE_PREFIX)) { /* handle */ }
```
Never refactor these functions to throw — the IPC boundary will silently swallow the error type.

### 4. Version sync — keep release/app in sync

`package.json` (root) is the source of truth for the version. `release/app/package.json` must
match. Run `npm run update-versions` or commit a change to `package.json` (the Husky pre-commit
hook auto-stages `release/app/package.json`).

### 5. CLI is a separate webpack bundle

`src/cli/index.ts` is compiled independently via `webpack.config.cli.ts` into
`dist/deadbolt-cli.js`. The bundle:
- marks `@node-rs/argon2` as `externals` (not bundled)
- injects a banner that adds `release/app/node_modules` to Node's `module.paths` at runtime

After any change to CLI source or to `encryptionAndDecryptionLib.ts`, run `npm run build:cli`
before running CLI e2e tests (or just run `npm test` — global setup does it automatically).

### 6. File format

Two formats are supported. Detection: if the file starts with `"DEADBOLT_V"`, it's V002+;
otherwise it's the legacy V001.

**V002 (current):** `[13B version header][16B salt][16B IV][16B auth tag][ciphertext]`
KDF: Argon2id, 2 GiB, 1 iter, 4 lanes

**V001 (legacy, read-only):** `[64B salt][16B IV][16B auth tag][ciphertext]`
KDF: PBKDF2-SHA512, 10 000 iterations

New encryptions always produce V002. V001 decryption shows a deprecation warning.

## Error Types

All extend `Error`. Keep the pattern minimal — name + one optional context property:

| Class | Extra property |
|-------|---------------|
| `DecryptionWrongPasswordError` | — |
| `EncryptedFileMissingMetadataError` | — |
| `Argon2OutOfMemoryError` | — |
| `FileReadError` | `operation: EncryptionOrDecryptionEnum` |
| `FileWriteError` | `operation: EncryptionOrDecryptionEnum` |
| `UnsupportedDeadboltFileVersion` | `version: string` |
