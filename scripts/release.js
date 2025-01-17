/* eslint-disable no-console */
// scripts/release.js
const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');
const which = require('which');

// Function to get the current version from package.json
function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  return packageJson.version;
}

// Function to prompt user for confirmation
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Main function to run the release process
async function release() {
  const currVersion = getCurrentVersion();
  console.log('');

  const choice = await promptUser(
    `Publish a release for deadbolt v${currVersion}? (y/N) `,
  );
  if (!['y', 'Y'].includes(choice)) {
    console.log(chalk.yellow('Aborting!'));
    process.exit();
  }

  /**
   * This whole section depends on execSync throwing if a process times out or has a non-zero exit code
   */

  // Check for unpushed changes
  try {
    execSync('git status --porcelain', { stdio: 'ignore' });
  } catch (error) {
    console.log(
      chalk.red(
        'Error: You have uncommitted changes. Please commit or stash them before releasing.',
      ),
    );
    process.exit(1);
  }

  // Check for unpushed commits
  try {
    execSync('git log @{u}..', { stdio: 'ignore' });
  } catch (error) {
    console.log(
      chalk.red(
        'Error: You have unpushed commits. Please push them before releasing.',
      ),
    );
    process.exit(1);
  }

  // Build electron app for Linux, Windows and macOS
  try {
    execSync('npm run package');
  } catch (error) {
    console.log(chalk.red('`$ npm run package` failed!'));
    console.error(chalk.red('Error during build process:'), error);
    console.log(chalk.red('Release stopped.'));
    process.exit(1);
  }

  // Push new releases to GitHub
  try {
    which.sync('gh');
  } catch (error) {
    console.log(
      chalk.red(
        'Error: GitHub CLI (gh) is not installed. Please install it before releasing.',
      ),
    );
    process.exit(1);
  }

  execSync(
    `gh release create "v${currVersion}" --target main --generate-notes`,
  );

  console.log(
    chalk.green(
      'Make sure to update the Homebrew tap, and any other package managers with the new release.\nA GitHub Action will be triggered to update the .',
    ),
  );
}

// Run the release process
release()
  .then(() => {
    console.log(chalk.green('Release completed successfully!'));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
