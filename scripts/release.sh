#!/bin/bash
# deadbolt release process

set -e

trap ctrl_c INT

function ctrl_c() {
        echo -e "\nWARNING: You may have to revert the last commit depending on where you exited the release process.";
        exit;
}

curr_version=$(node -p "require('./package.json').version")
echo ""

read -r -p "Publish a release for deadbolt v${curr_version}? (y/N)" choice
case "$choice" in
  y|Y ) echo "yes";;
  n|N|* ) echo "Aborting!" && exit;;
esac

# Check for unpushed changes
if [[ $(git status --porcelain) ]]; then
  echo "Error: You have uncommitted changes. Please commit or stash them before releasing."
  exit 1
fi

if [[ $(git log @{u}.. 2> /dev/null) ]]; then
  echo "Error: You have unpushed commits. Please push them before releasing."
  exit 1
fi

# Build electron app for Linux, Windows and macOS.
# Just to make sure everything builds. We will redo the building in CI when a new tag starting with `v` is pushed.
npm run package || echo "Build failed!" && exit 1

# Push new releases to GitHub
gh release create "v${curr_version}" --target main --generate-notes

echo -e "Make sure to update the Homebrew tap with the new release.\n"
