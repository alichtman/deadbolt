#!/bin/bash
# deadbolt release process

set -e

trap ctrl_c INT

function ctrl_c() {
        echo "WARNING: You may have to revert the last commit depending on where you exited the release process.";
        exit;
}

echo "Version increment?"
echo "  1) Major"
echo "  2) Minor"
echo "  3) Patch"

bump=""

read n
case $n in
  1) bump="major";;
  2) bump="minor";;
  3) bump="patch";;
  *) echo "Invalid option"; exit;;
esac

curr_version=$(node -p "require('./package.json').version")
echo "Current version: ${curr_version}"

npm version "$bump" -m "Version bump to v${version}"
new_version=$(node -p "require('./package.json').version")
echo "New version: ${new_version}"

read -p "Continue (y/N)?" choice
case "$choice" in
  y|Y ) echo "yes";;
  n|N|* ) echo "Revert last commit!" && exit;;
esac

git push

# Build electron app for Linux, Windows and macOS

npm run preelectron-pack && npm run dist

# Push new releases to GitHub
hub release create -a "dist/Deadbolt-${new_version}-mac.zip" -a "dist/Deadbolt ${new_version}.exe" -a "dist/deadbolt_${new_version}_amd64.deb" -m "deadbolt v${new_version}" "${new_version}"

# Homebrew

echo "Make sure to update the Homebrew tap with the new release.\n"
