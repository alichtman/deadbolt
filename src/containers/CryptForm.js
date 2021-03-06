import React, { Component, Fragment } from "react";
import "./CryptForm.css";

import FileHeader from "../components/FileHeader";
import Input from "../components/Input";
import Button from "../components/Button";

export default class CryptForm extends Component {
	constructor(props) {
		super(props);

		this.state = {
			password: "",
			confirmPassword: "",
			displayError: props.displayError
		};
	}

	componentDidUpdate(prevProps) {
		if (this.props.displayError !== prevProps.displayError) {
			this.setState({ displayError: this.props.displayError });
		}
	}

	onSubmitWrapper = () => {
		const { onSubmit, isDecryption } = this.props;
		const { password, confirmPassword } = this.state;

		if (isDecryption) {
			onSubmit(password);
		} else if (password === confirmPassword) {
			onSubmit(password);
		} else {
			this.setState({ displayError: true });
		}
	};

	onKeyPress = event => {
		if (event.key === "Enter") {
			this.onSubmitWrapper();
		}
		this.setState({ displayError: false });
	};

	render() {
		const { fileName, onAbort, isDecryption } = this.props;
		const { password, confirmPassword, displayError } = this.state;

		let buttonIconPath, buttonText, errorMessage;
		if (isDecryption) {
			buttonIconPath = "./decryptIcon.svg";
			buttonText = "Decrypt";
			errorMessage = "Error: Incorrect password";
		} else {
			buttonIconPath = "./encryptIcon.svg";
			buttonText = "Encrypt";
			errorMessage = "Error: Passwords don't match";
		}

		return (
			<Fragment>
				<FileHeader fileName={fileName} />
				<div className="formBody">
					<Input
						placeholder="Enter password"
						value={password}
						onChange={event =>
							this.setState({ password: event.target.value })
						}
						inErrorMode={displayError}
						onKeyPress={this.onKeyPress}
						autofocus
					/>
					{!isDecryption ? (
						<Input
							placeholder="Confirm password"
							value={confirmPassword}
							onChange={event =>
								this.setState({
									confirmPassword: event.target.value
								})
							}
							onKeyPress={this.onKeyPress}
							inErrorMode={displayError}
						/>
					) : null}
					{displayError ? (
						<span className="errorText">{errorMessage}</span>
					) : null}
					<div className="buttonsWrapper">
						<Button isPrimary={true} onClick={this.onSubmitWrapper}>
							<img
								className="primaryButtonIcon"
								src={buttonIconPath}
							/>
							<span className="primaryButtonText">
								{buttonText}
							</span>
						</Button>
						<Button isPrimary={false} onClick={onAbort}>
							<span className="abortButtonText">Abort</span>
						</Button>
					</div>
				</div>
			</Fragment>
		);
	}
}

CryptForm.defaultProps = {
	isDecryption: false,
	displayError: false
};
