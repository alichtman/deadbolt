#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Detect whether we're in the source checkout by the presence of the .erb
// directory, which is not included in the published npm package.
// - Source checkout (git clone && npm install): run full dev setup
// - Package install (npm install -g, npx, etc.): @node-rs/argon2 is handled
//   by npm automatically via dependencies; skip dev-only setup entirely.
const isSourceCheckout = fs.existsSync(path.join(__dirname, '../.erb'));
if (!isSourceCheckout) {
  process.exit(0);
}

const { execSync } = require('child_process');
execSync(
  'ts-node .erb/scripts/check-native-dep.js && electron-builder install-app-deps && npm run build:dll',
  { stdio: 'inherit', shell: true },
);
