import React, { Component } from "react";
import "./App.css";

// Containers
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
 * 3 = Decryption failure view
 */

export default class App extends Component {
	constructor(props) {
		super(props);

		this.state = DEFAULT_STATE;
	}

	/* Event Handlers */

	setFilePath = file => {
		const { name, path, type } = file;
		this.setState({
			filePath: path,
			fileName: name,
			fileType: type,
			cryptedFilePath: "",
			viewCode: 1
		});

		return false;
	};

	onAbort = () => this.setState(DEFAULT_STATE);

	render() {
		const {
			filePath,
			fileName,
			fileType,
			cryptedFilePath,
			viewCode
		} = this.state;
		const fileIsEncrypted = filePath.endsWith(".qlock");

		let appBody;
		if (viewCode === 0) {
			appBody = <FileUpload setFilePath={this.setFilePath} />;
		} else if (viewCode === 1 && !fileIsEncrypted) {
			appBody = (
				<CryptForm
					fileName={fileName}
					onSubmit={password => {
						let encryptedFilePath = ipcRenderer.sendSync(
							"encryptFileRequest",
							{ filePath, password }
						);
						this.setState({
							viewCode: 2,
							cryptedFilePath: encryptedFilePath
						});
					}}
					onAbort={this.onAbort}
				/>
			);
		} else if (viewCode === 1 && fileIsEncrypted) {
			appBody = (
				<CryptForm
					fileName={fileName}
					onSubmit={password => {
						let decryptedFilePath = ipcRenderer.sendSync(
							"decryptFileRequest",
							{ filePath, password }
						);
						this.setState({
							viewCode: 2,
							cryptedFilePath: decryptedFilePath
						});

						return (
							decryptedFilePath !== "QUICKLOCK_ENCRYPTION_FAILURE"
						);
					}}
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
		}

		return (
			<div className="app">
				<div className="titlebar" />
				{appBody}
			</div>
		);
	}
}
