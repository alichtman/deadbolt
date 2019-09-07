import React, { Component } from "react";
import "./FileHeader.css";

export default class FileHeader extends Component {
  render() {
    const { fileName } = this.props;

    return (
      <div className="fileHeader">
        <div className="fileName">
          <img src="./sampleFileIcon.png" />
          <span>{fileName}</span>
        </div>
        <div className="border" />
      </div>
    );
  }
}
