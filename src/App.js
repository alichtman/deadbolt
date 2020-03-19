import React, { Component } from "react";
import "./App.css";

import FileUpload from "./containers/FileUpload";
import CryptForm from "./containers/CryptForm";
import SuccessScreen from "./containers/SuccessScreen";

const { ipcRenderer } = window.require("electron");

const DEFAULT_STATE = {
	filePath: "",
	fileName: "",
	fileType: "",
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
		const { name, path, type } = file;
		this.setState({
			filePath: path,
			fileName: name,
			fileType: type,
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
		const {
			filePath,
			fileName,
			fileType,
			cryptedFilePath,
			viewCode
		} = this.state;
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
