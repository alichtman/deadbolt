import React, { Component } from "react";
import "./PrimaryButton.css";

export default class PrimaryButton extends Component {
  render() {
    const { onClick, children } = this.props;

    return (
      <div className="primaryButton" onClick={onClick}>
        {children}
      </div>
    );
  }
}
