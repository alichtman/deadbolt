#!/bin/bash

function check_requirements_and_install_missing() {
	if [ "$(which openssl)" == "openssl not found" ]; then
		if [ "$(which brew)" == "brew not found" ]; then
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
}

function install_app_and_workflow() {
	open "dist/Encrypt Decrypt.workflow"
	cp "assets/EncryptedFileIcon.png" "dist/Encrypt Decrypt.app/Contents/Resources/"
	cp "src/set-custom-icon.sh" "dist/Encrypt Decrypt.app/Contents/MacOS/"
	cp -r "dist/Encrypt Decrypt.app" "/Applications/"
}

function create_config_file() {
	conf_file="$HOME/.encrypt-decrypt.plist"
	echo "Creating config file at $conf_file"
	if [ -f "$conf_file" ]; then
		while true; do
			read -p "An existing config file for this application has been detected. Would you like to overwrite it? [y/n] : " yn
			case $yn in
				[Yy]* ) rm "$conf_file"; break;;
				[Nn]* ) exit_handler;;
				* ) echo "Please answer yes or no.";;
			esac
		done
	fi

	/usr/libexec/PlistBuddy -c 'add encryptedFileExtension string .encrypted' "$conf_file" &>/dev/null
	/usr/libexec/PlistBuddy -c 'add deleteEncryptedFileAfterDecryption bool False' "$conf_file"
}

exit_handler() {
	echo "Installation complete!"
	exit
}

check_requirements_and_install_missing
install_app_and_workflow
create_config_file
exit_handler
