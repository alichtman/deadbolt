#!/bin/bash
# deadbolt release process

set -e

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

version=$(node -p "require('./package.json').version")
echo "New version: ${version}"

npm version "$bump" -m "Version bump to v${version}"

read -p "New version: ${version} -- Continue (y/N)?" choice
case "$choice" in
  y|Y ) echo "yes";;
  n|N|* ) echo "Revert last commit!" && exit;;
esac

git push

# Build electron app for Linux, Windows and macOS

npm run preelectron-pack && npm run dist

# Push new releases to GitHub
hub release create -a "dist/Deadbolt-${version}-mac.zip" -a "dist/Deadbolt ${version}.exe" -a "dist/deadbolt_${version}_amd64.deb" -m "deadbolt v${version}" "${version}"

# Homebrew

echo "Make sure to update the Homebrew tap with the new release.\n"
