import React, { Component } from "react";
import "./App.css";

import FileUpload from "./containers/FileUpload";
import CryptForm from "./containers/CryptForm";
import SuccessScreen from "./containers/SuccessScreen";

const { ipcRenderer, remote } = window.require("electron");

const DEFAULT_STATE = {
	filePath: "",
	fileName: "",
	viewCode: 0
};

/* View Codes
 * 0 = File Upload view
 * 1 = Encrypt/Decrypt view
 * 2 = Success view
 * 3 = Decryption Failure view
 */

export default class App extends Component {
	constructor(props) {
		super(props);

		this.state = DEFAULT_STATE;
	}

	/* Utilities */

	setFilePath = file => {
		const { name, path } = file;
		this.setState({
			filePath: path,
			fileName: name,
			cryptedFilePath: "",
			viewCode: 1
		});
	};

	/* Event Handlers */

	onAbort = () => this.setState(DEFAULT_STATE);

	onEncrypt = password => {
		const { filePath } = this.state;
		const encryptedFilePath = ipcRenderer.sendSync("encryptFileRequest", {
			filePath,
			password
		});

		this.setState({
			viewCode: 2,
			cryptedFilePath: encryptedFilePath
		});
	};

	onDecrypt = password => {
		const { filePath } = this.state;

		ipcRenderer.send("decryptFileRequest", { filePath, password });
		ipcRenderer.on("decryptFileResponse", (event, arg) => {
			const { decryptedFilePath, error } = arg;

			if (!error) {
				this.setState({
					viewCode: 2,
					cryptedFilePath: decryptedFilePath
				});
			} else {
				this.setState({ viewCode: 3 });
			}
		});
	};

	render() {
		const { cryptedFilePath, viewCode } = this.state;

		let filePath, fileName;
		if (remote.process.argv.length >= 2) {
			filePath = remote.process.argv[1];
			let splitFilePath = filePath.split("/");
			fileName = splitFilePath[splitFilePath.length - 1];
		} else {
			filePath = this.state.filePath;
			fileName = this.state.fileName;
		}

		const fileIsEncrypted = filePath.endsWith(".dbolt");

		let appBody;
		if (viewCode === 0) {
			appBody = <FileUpload setFilePath={this.setFilePath} />;
		} else if (viewCode === 1 && !fileIsEncrypted) {
			appBody = (
				<CryptForm
					fileName={fileName}
					onSubmit={this.onEncrypt}
					onAbort={this.onAbort}
				/>
			);
		} else if (viewCode === 1 && fileIsEncrypted) {
			appBody = (
				<CryptForm
					fileName={fileName}
					onSubmit={this.onDecrypt}
					onAbort={this.onAbort}
					isDecryption={fileIsEncrypted}
				/>
			);
		} else if (viewCode === 2) {
			appBody = (
				<SuccessScreen
					onGoHome={() => this.setState({ viewCode: 0 })}
					filePath={cryptedFilePath}
				/>
			);
		} else if (viewCode === 3) {
			appBody = (
				<CryptForm
					fileName={fileName}
					onSubmit={this.onDecrypt}
					onAbort={this.onAbort}
					isDecryption={fileIsEncrypted}
					displayError={true}
				/>
			);
		}

		return (
			<div className="app">
				<div className="titlebar" />
				{appBody}
			</div>
		);
	}
}
