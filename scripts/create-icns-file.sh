#!/bin/bash
# $ ./create-icns-file.sh icon.png
# https://github.com/alichtman/scripts/blob/master/create-icns-file.sh

# This script creates a .icns file from a single PNG image.
# Modified from: https://stackoverflow.com/a/20703594

if [ -z "$1" ]; then
	printf "USAGE\n\t$ ./create-icns-file.sh icon.png"
	exit
fi

iconset_dir="Icon.iconset"

mkdir "$iconset_dir"
sips -z 16 16     "$1" --out "$iconset_dir"/icon_16x16.png
sips -z 32 32     "$1" --out "$iconset_dir"/icon_16x16@2x.png
sips -z 32 32     "$1" --out "$iconset_dir"/icon_32x32.png
sips -z 64 64     "$1" --out "$iconset_dir"/icon_32x32@2x.png
sips -z 128 128   "$1" --out "$iconset_dir"/icon_128x128.png
sips -z 256 256   "$1" --out "$iconset_dir"/icon_128x128@2x.png
sips -z 256 256   "$1" --out "$iconset_dir"/icon_256x256.png
sips -z 512 512   "$1" --out "$iconset_dir"/icon_256x256@2x.png
sips -z 512 512   "$1" --out "$iconset_dir"/icon_512x512.png
cp "$1" "$iconset_dir"/icon_512x512@2x.png
iconutil -c icns "$iconset_dir"
rm -R "$iconset_dir"
