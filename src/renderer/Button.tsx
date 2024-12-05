import React from "react";
import "./Button.css";

interface ButtonProps {
  onClick: () => void;
  isPrimary: boolean;
  children: React.ReactNode;
}

export default function Button({ onClick, isPrimary, children }: ButtonProps) {
  return (
    <div
      className={isPrimary ? "primaryButton" : "secondaryButton"}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
