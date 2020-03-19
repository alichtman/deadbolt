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

# Build electron app

npm run preelectron-pack && npm run dist

# Publish on npm

npm publish

# Push new release to GitHub

version="$(npm version | rg deadbolt | cut -d ":" -f 2 | sed s/\'//g | sed s/,//g | sed s/\ //g)"
hub release create -m "deadbolt v$version" "$version" -a dist/deadbolt-"$version"-mac.dmg
