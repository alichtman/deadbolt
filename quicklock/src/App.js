import React, { Component } from "react";
import "./App.css";

export default class App extends Component {
  onFileDrop = event => {
    event.preventDefault();

    // event.dataTransfer.files[0];

    return false;
  };

  render() {
    return (
      <div className="app">
        <div
          className="fileUpload"
          onDragOver={event => {
            event.preventDefault();
            return false;
          }}
          onDragLeave={() => false}
          onDragEnd={() => false}
          onDrop={this.onFileDrop}
        >
          <span>Drop your file here.</span>
        </div>
      </div>
    );
  }
}
