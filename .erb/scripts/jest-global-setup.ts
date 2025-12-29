import { execSync } from 'child_process';
import chalk from 'chalk';

export default async function globalSetup() {
  console.log(chalk.blue('\nBuilding CLI before running E2E tests...'));
  try {
    execSync('npm run build:cli', { stdio: 'inherit' });
    console.log(chalk.green('CLI build completed successfully'));
  } catch (error) {
    console.error(chalk.red('Failed to build CLI'));
    throw error;
  }
}
