import React, { Component } from "react";
import "./SecondaryButton.css";

export default class SecondaryButton extends Component {
  render() {
    const { onClick, children } = this.props;

    return (
      <div className="secondaryButton" onClick={onClick}>
        {children}
      </div>
    );
  }
}
