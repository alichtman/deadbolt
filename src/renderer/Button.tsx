import React from 'react';
import './Button.css';

export default function Button({
  onClick,
  isPrimary,
  children,
}: {
  onClick: () => void;
  isPrimary: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={isPrimary ? 'primaryButton' : 'secondaryButton'}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
