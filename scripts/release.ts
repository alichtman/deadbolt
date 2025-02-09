/* eslint-disable no-console */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as readline from 'readline';
import chalk from 'chalk';
import which from 'which';
import copyVersionFromMainToApp from './copy-version-from-main-to-app';

function logFatalError(error: string): void {
  console.log(chalk.red.bold(error));
  process.exit(1);
}

// Function to get the current version from package.json
function getCurrentVersion(): string {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  return packageJson.version;
}

const CURRENT_VERSION = `v${getCurrentVersion()}`;

// Function to prompt user for confirmation
function promptUser(question: string): Promise<string> {
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

function printCurrentGHReleases(): void {
  try {
    console.log(chalk.green.bold('Current GitHub Releases:\n'));
    execSync('gh release list', { stdio: 'inherit' });
  } catch (error) {
    logFatalError(
      'Error: Unable to fetch GitHub releases. Please ensure you have the GitHub CLI installed and authenticated.',
    );
  }
}

function ensureGHCLIInstalled(): void {
  try {
    which.sync('gh');
  } catch (error) {
    logFatalError(
      'Error: GitHub CLI (gh) is not installed. Please install it before releasing.',
    );
  }
}

/**
 * This whole section depends on execSync throwing if a process times out or has a non-zero exit code
 */
function ensureReleaseIsSafe(): void {
  // Check for uncommitted changes
  const uncommittedChanges = execSync('git status --porcelain').toString();
  if (uncommittedChanges) {
    logFatalError(
      'Error: You have uncommitted changes. Please commit or stash them before releasing.',
    );
  }

  // Check for unpushed commits
  try {
    execSync('git log @{u}..', { stdio: 'ignore' });
  } catch (error) {
    logFatalError(
      'Error: You have unpushed commits. Please push them before releasing.',
    );
  }

  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD')
    .toString()
    .trim();
  if (currentBranch !== 'main') {
    logFatalError(
      'Error: You are not on the main branch. Please switch to the main branch before releasing.',
    );
  }

  // Check if the current version is already a tag (locally or remotely)
  try {
    // Fetch all tags from remote to ensure we have the latest
    execSync('git fetch --tags', { stdio: 'ignore' });

    // Check both local and remote tags
    const output = execSync(`git tag -l ${CURRENT_VERSION}`, {
      stdio: 'pipe',
    })
      .toString()
      .trim();

    if (output) {
      logFatalError(
        `Error: Version ${CURRENT_VERSION} is already tagged locally or remotely. Please bump the version in package.json.`,
      );
    }
  } catch {
    // Tag doesn't exist anywhere, which is what we want
    console.log(
      chalk.yellow(
        `Tag ${CURRENT_VERSION} does not exist locally or remotely.`,
      ),
    );
  }
}

// Main function to run the release process
async function release(): Promise<void> {
  // If this next operation causes a source control change, the release will fail (as it should)
  copyVersionFromMainToApp();
  ensureReleaseIsSafe();
  ensureGHCLIInstalled();
  printCurrentGHReleases();

  const prettyVersion = `deadbolt ${CURRENT_VERSION}`;
  const prettyVersionWithColors = `${chalk.green.bold('deadbolt')} ${chalk.yellow.bold(CURRENT_VERSION)}`;

  const proceedWithReleasePrompt = await promptUser(
    `\nPublish a new (pre-release or real) release for ${prettyVersionWithColors}? (y/N) `,
  );
  if (!['y', 'Y'].includes(proceedWithReleasePrompt)) {
    console.log(chalk.yellow('Aborting!'));
    process.exit();
  }

  // Auto-detect if this is a pre-release based on version string
  let isAutodetectedPrerelease = false;
  let isPrerelease = false;
  if (CURRENT_VERSION.endsWith('-beta') || CURRENT_VERSION.endsWith('-alpha')) {
    console.log(
      chalk.yellow(`Version ${CURRENT_VERSION} detected as pre-release`),
    );
    isAutodetectedPrerelease = true;
  }

  if (!isAutodetectedPrerelease) {
    const releaseTypePrompt = await promptUser(
      'What type of release is this?\n1. prerelease\n2. real\nEnter p or r: ',
    );

    if (releaseTypePrompt === 'p') {
      isPrerelease = true;
    } else if (releaseTypePrompt === 'r') {
      isPrerelease = false;
    } else {
      console.log(chalk.yellow('Invalid selection. Aborting!'));
      process.exit(1);
    }
  }

  const releaseVerbiage =
    isPrerelease || isAutodetectedPrerelease ? 'pre-release' : 'release';

  // Confirm creating a release / pre-release
  const confirmReleasePrompt = await promptUser(
    `Are you sure you want to create a ${releaseVerbiage} for ${prettyVersionWithColors}? (y/N) `,
  );
  if (!['y', 'Y'].includes(confirmReleasePrompt)) {
    console.log(chalk.yellow('Aborting!'));
    process.exit();
  }
  // Create a new tag and a new github release (all done inside the gh release create cmd)
  return new Promise((resolve, reject) => {
    try {
      const command = `gh release create ${CURRENT_VERSION} --title "${prettyVersion}" --target main --generate-notes ${
        isAutodetectedPrerelease || isPrerelease ? '--prerelease' : ''
      }`;
      console.log(chalk.green.bold(`Executing command: $ ${command}`));
      execSync(command, { stdio: 'inherit' });
      console.log(
        chalk.green.bold(
          'A release has been created. You will need to publish it from the GitHub UI. CI will populate the build artifacts. Make sure to update the Homebrew tap, and any other package managers with the new release.\n',
        ),
      );
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// Run the release process
release()
  .then(() => {
    console.log(chalk.green.bold('Release completed successfully!'));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
