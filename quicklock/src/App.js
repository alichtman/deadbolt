import React, { Component } from "react";
import "./App.css";

// Containers
import FileUpload from "./containers/FileUpload";
import EncryptionForm from "./containers/EncryptionForm";
import DecryptionForm from "./containers/DecryptionForm";
import SuccessScreen from "./containers/SuccessScreen";

// const { ipcRenderer } = require("electron");
// import { ipcRenderer } from "electron";
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
			viewCode: 1
		});

		return false;
	};

	onAbort = () => this.setState(DEFAULT_STATE);

	render() {
		const { filePath, fileName, fileType, viewCode } = this.state;
		const fileIsEncrypted = filePath.endsWith(".qlock");

		let appBody;
		if (viewCode === 0) {
			appBody = <FileUpload setFilePath={this.setFilePath} />;
		} else if (viewCode === 1 && !fileIsEncrypted) {
			appBody = (
				<EncryptionForm
					fileName={fileName}
					onEncrypt={password => {
						let encryptedFilePath = ipcRenderer.sendSync(
							"encryptFileRequest",
							{ filePath, password }
						);
						console.log(encryptedFilePath);
						this.setState({
							viewCode: 2
						});
					}}
					onAbort={this.onAbort}
				/>
			);
		} else if (viewCode === 1 && fileIsEncrypted) {
			appBody = (
				<DecryptionForm
					fileName={fileName}
					onDecrypt={password => {
                        let decryptedFilePath = ipcRenderer.sendSync(
							"decryptFileRequest",
							{ filePath, password }
						);
						console.log(decryptedFilePath);
						if (decryptedFilePath != "QUICKLOCK_ENCRYPTION_FAILURE") {
						    this.setState({
							    viewCode: 2
						    });
						} else {
                            this.setState({
                                viewCode: 3
                            })
						}
					}}
					onAbort={this.onAbort}
				/>
			);
		} else if (viewCode === 2) {
			appBody = (
				<SuccessScreen
					onGoHome={() => this.setState({ viewCode: 0 })}
					filePath={filePath}
				/>
			);
		}

		return <div className="app">{appBody}</div>;
	}
}
