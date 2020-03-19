#!/bin/bash
# deadbolt release process

# Increment version

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

npm version "$bump"
git push

# Build electron app for Linux, Windows and macOS

npm run preelectron-pack && npm run dist

# Push new release to GitHub

version=$(node -p "require('./package.json').version")
hub release create -m "deadbolt v$version" "$version" -a dist/deadbolt-"$version"-mac.dmg

# Homebrew

echo "Make sure to update the Homebrew tap with the new release.\n"
