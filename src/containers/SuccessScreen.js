import React, { Component, Fragment } from "react";
import "./SuccessScreen.css";

import Lottie from "react-lottie";
import checkmarkAnimationData from "../checkmark.json";

import Button from "../components/Button";

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
	onRevealInFinder = () => {
		const { filePath } = this.props;
		const shellToUse = shell || remote.shell;

		shellToUse.showItemInFolder(filePath);
	};

	render() {
		const { onGoHome } = this.props;

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
						<Button
							isPrimary={true}
							onClick={this.onRevealInFinder}
						>
							<span className="openFinderText">
								Reveal in Finder
							</span>
						</Button>
						<Button isPrimary={false} onClick={onGoHome}>
							<span className="backToQuickLockText">
								Back to Home
							</span>
						</Button>
					</div>
				</div>
			</Fragment>
		);
	}
}
