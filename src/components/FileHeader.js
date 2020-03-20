import React, { Component } from "react";
import "./FileHeader.css";

import "file-icons-js/css/style.css";
import icons from "file-icons-js";

export default class FileHeader extends Component {
	render() {
		const { fileName } = this.props;
		const iconClassName = icons.getClass(fileName);
		const fileIsEncrypted = fileName.endsWith(".dbolt");

		return (
			<div className="fileHeader">
				<div className="fileName">
					<span className="filePathWrapper">
						{fileIsEncrypted ? null : (
							<span className={iconClassName} id="fileIcon" />
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
