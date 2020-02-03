import React, { Component } from "react";
import "./FileUpload.css";

export default class FileUpload extends Component {
	constructor(props) {
		super(props);
		this.onClick = this.onClick.bind(this);
	}

	onDragOver = event => {
		event.preventDefault();
		return false;
	};

	onClick = event => {
		this.refs.fileUploader.click();
	};

	render() {
		const { setFilePath } = this.props;

		return (
			<div
				className="fileUpload"
				onDragOver={this.onDragOver}
				onDragLeave={() => false}
				onDragEnd={() => false}
				onDrop={event => {
					event.preventDefault();
					let file = event.dataTransfer.files[0];

					return setFilePath(file);
				}}
				onClick={this.onClick}
			>
				<input
					type="file"
					ref="fileUploader"
					style={{ display: "none" }}
					onChange={event => {
						event.stopPropagation();
						event.preventDefault();
						let file = event.target.files[0];

						return setFilePath(file);
					}}
				/>
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
