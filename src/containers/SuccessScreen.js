import React, { Component, Fragment } from "react";
import Lottie from "react-lottie";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";

import checkmarkAnimationData from "../checkmark.json";
import "./SuccessScreen.css";

const { shell, remote } = window.require("electron");

const animationOptions = {
	loop: false,
	autoplay: true,
	animationData: checkmarkAnimationData,
	rendererSettings: {
		preserveAspectRatio: "xMidYMid slice"
	}
};

export default class SuccessScreen extends Component {
	render() {
		const { onGoHome, filePath } = this.props;

		return (
			<Fragment>
				<div className="successBody">
					<Lottie
						options={animationOptions}
						height={100}
						width={200}
					/>
					<span className="successText">Success!</span>
					<div className="buttonsWrapper">
						<PrimaryButton
							onClick={() => {
								const shellToUse = shell || remote.shell;
								shellToUse.showItemInFolder(filePath);
							}}
						>
							<span className="openFinderText">
								Reveal in Finder
							</span>
						</PrimaryButton>
						<SecondaryButton onClick={onGoHome}>
							<span className="backToQuickLockText">
								Back to Home
							</span>
						</SecondaryButton>
					</div>
				</div>
			</Fragment>
		);
	}
}
