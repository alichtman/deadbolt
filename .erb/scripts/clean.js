import { rimrafSync } from 'rimraf';
import fs from 'fs';
import webpackPaths from '../configs/webpack.paths';

// Don't clean anything in CI. We guarantee that the dist/ directory is clean bc we just cloned the repo.
if (process.env.CI) {
  console.log('Skipping clean in CI environment');
  process.exit(0);
}

const foldersToRemove = [
  webpackPaths.distPath,
  webpackPaths.buildPath,
  webpackPaths.dllPath,
];

foldersToRemove.forEach((folder) => {
  if (fs.existsSync(folder)) rimrafSync(folder);
});
