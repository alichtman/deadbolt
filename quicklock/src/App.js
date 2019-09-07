import React, { Component } from "react";
import "./App.css";

// Containers
import FileUpload from "./containers/FileUpload";
import EncryptionForm from "./containers/EncryptionForm";
import DecryptionForm from "./containers/DecryptionForm";
import SuccessScreen from "./containers/SuccessScreen";

const DEFAULT_STATE = {
  filePath: "",
  fileName: "",
  fileType: "",
  success: false
};

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = DEFAULT_STATE;
  }

  /* Event Handlers */

  onFileDrop = event => {
    event.preventDefault();

    const { name, path, type } = event.dataTransfer.files[0];
    this.setState({ filePath: path, fileName: name, fileType: type });

    return false;
  };

  onAbort = () => this.setState(DEFAULT_STATE);

  render() {
    const { filePath, fileName, fileType, success } = this.state;

    let appBody;
    if (!filePath && !success) {
      appBody = <FileUpload onFileDrop={this.onFileDrop} />;
    } else if (!filePath && success) {
      appBody = <SuccessScreen onGoHome={() => {}} />;
    } else if (!filePath.endsWith(".encrypted")) {
      appBody = (
        <EncryptionForm
          fileName={fileName}
          onEncrypt={() => {}}
          onAbort={this.onAbort}
        />
      );
    } else {
      appBody = (
        <DecryptionForm
          fileName={fileName}
          onDecrypt={() => {}}
          onAbort={this.onAbort}
        />
      );
    }

    return <div className="app">{appBody}</div>;
  }
}
