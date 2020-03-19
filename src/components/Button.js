import React, { Component } from "react";
import "./Button.css";

export default class Button extends Component {
	render() {
		const { onClick, isPrimary, children } = this.props;

		return (
			<div
				className={isPrimary ? "primaryButton" : "secondaryButton"}
				onClick={onClick}
			>
				{children}
			</div>
		);
	}
}
