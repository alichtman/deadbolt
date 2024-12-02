import React, { Component } from "react";
import "./FileHeader.css";
import { FileIcon } from "react-file-icon";
import { FaLock } from "react-icons/fa";

export default class FileHeader extends Component {
	render() {
		const { fileName } = this.props;
		const fileIsEncrypted = fileName.endsWith(".dbolt");

		return (
			<div className="fileHeader">
				<div className="fileName">
					<span className="filePathWrapper">
						{fileIsEncrypted ? (
							<FaLock />
						) : (
							<FileIcon
								extension={fileName.split(".").pop()}
								{...this.props}
							/>
						)}
						<span
							className={
								fileIsEncrypted
									? "filePathEncrypted"
									: "filePath"
							}
						>
							{fileName}
						</span>
					</span>
				</div>
			</div>
		);
	}
}
