import React from 'react';
import './Button.css';

export default function Button({
  onClick,
  buttonType,
  children,
}: {
  onClick: () => void;
  buttonType: 'primary' | 'cancel' | 'goHome';
  children: React.ReactNode;
}) {
  let buttonClass: string;

  switch (buttonType) {
    case 'primary':
      buttonClass = 'primaryButton';
      break;
    case 'cancel':
      buttonClass = 'cancelButton';
      break;
    case 'goHome':
      buttonClass = 'goHomeButton';
      break;
    default:
      buttonClass = 'primaryButton';
  }

  return (
    <div
      className={buttonClass}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      role="button"
      aria-pressed={buttonType === 'primary'}
    >
      {children}
    </div>
  );
}
