/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const mainPackagePath = path.join(__dirname, '../package.json');
const appPackagePath = path.join(__dirname, '../release/app/package.json');

const mainPackage = JSON.parse(fs.readFileSync(mainPackagePath, 'utf8'));
const appPackage = JSON.parse(fs.readFileSync(appPackagePath, 'utf8'));

console.log(
  `Copying version (${mainPackage.version}) from ${mainPackagePath} to ${appPackagePath}`,
);

// Update the version in the app package
appPackage.version = mainPackage.version;

// Write the updated app package back to file
fs.writeFileSync(appPackagePath, JSON.stringify(appPackage, null, 2));
console.log(
  `Updated version in release/app/package.json to ${mainPackage.version}`,
);
