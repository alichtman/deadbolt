#!/bin/bash

if [ `which openssl` == "openssl not found" ]; then
	if [ `which brew` == "brew not found" ]; then
		read -p "You are missing homebrew. Install it now? [y/n] : " yn
		case $yn in
			[Yy]* ) /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)";;
			[Nn]* ) exit;;
			* ) echo "Please answer yes or no.";;
		esac
	fi

	while true; do
		read -p "You are missing openssl. $ brew install it? [y/n] : " yn
		case $yn in
			[Yy]* ) brew install openssl;;
			[Nn]* ) exit;;
			* ) echo "Please answer yes or no.";;
		esac
	done
fi

open "dist/Encrypt Decrypt.workflow"
cp -r "dist/Encrypt Decrypt.app" /Applications/
