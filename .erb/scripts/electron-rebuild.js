import { execSync } from 'child_process';
import fs from 'fs';
import { dependencies } from '../../release/app/package.json';
import webpackPaths from '../configs/webpack.paths';

if (
  Object.keys(dependencies || {}).length > 0 &&
  fs.existsSync(webpackPaths.appNodeModulesPath)
) {
  const electronRebuildCmd =
    '../../node_modules/.bin/electron-rebuild --force --types prod,dev,optional --module-dir .';
  const cmd =
    process.platform === 'win32'
      ? electronRebuildCmd.replace(/\//g, '\\')
      : electronRebuildCmd;
  execSync(cmd, {
    cwd: webpackPaths.appPath,
    stdio: 'inherit',
  });

  // @node-rs/argon2 ships prebuilt NAPI binaries selected by npm at install time based
  // on process.arch. On macOS with Rosetta 2, Node.js reports x64 so npm only installs
  // the x64 binding — but Electron runs natively as arm64 and needs the arm64 binding.
  // Force-install both darwin variants so the app works regardless of which Node.js is
  // used to run npm.
  if (process.platform === 'darwin') {
    const argon2Version =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../release/app/node_modules/@node-rs/argon2/package.json').version;
    execSync(
      `npm install --ignore-scripts --force @node-rs/argon2-darwin-arm64@${argon2Version} @node-rs/argon2-darwin-x64@${argon2Version}`,
      { cwd: webpackPaths.appPath, stdio: 'inherit' }
    );
  }
}
