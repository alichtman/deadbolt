import React, { Component } from "react";
import "./FileHeader.css";

import "file-icons-js/css/style.css";
import icons from "file-icons-js";

export default class FileHeader extends Component {
	render() {
		const { fileName } = this.props;
		const iconClassName = icons.getClass(fileName);

		return (
			<div className="fileHeader">
				<div className="fileName">
					<span className="filePathWrapper">
						<span className={iconClassName} id="fileIcon" />
						<span className="filePath">{fileName}</span>
					</span>
				</div>
			</div>
		);
	}
}
