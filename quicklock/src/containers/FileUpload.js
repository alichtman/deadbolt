import React, { Component } from "react";
import "./FileUpload.css";

export default class FileUpload extends Component {
  onDragOver = event => {
    event.preventDefault();
    return false;
  };

  render() {
    const { onFileDrop } = this.props;

    return (
      <div
        className="fileUpload"
        onDragOver={this.onDragOver}
        onDragLeave={() => false}
        onDragEnd={() => false}
        onDrop={onFileDrop}
      >
        <div className="fileUploadIcon">
          <img src="./dropFileIcon.svg" />
        </div>
        <span className="fileUploadText">
          Drop your file here to encrypt or decrypt it.
        </span>
      </div>
    );
  }
}
