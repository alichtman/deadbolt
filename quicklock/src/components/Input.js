import React, { Component } from "react";
import "./Input.css";

export default class Input extends Component {
  render() {
    const { placeholder, value, onChange } = this.props;

    return (
      <input
        className="inputBar"
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    );
  }
}
