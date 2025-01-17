import React, { useState } from 'react';
import './EncryptOrDecryptForm.css';
import PasswordInput from './PasswordInput';
import Button from './Button';
import DecryptIcon from './assets/decryptIcon.svg';
import EncryptIcon from './assets/encryptIcon.svg';
import EncryptOrDecryptFileHeader from './EncryptOrDecryptFileHeader';

export default function EncryptOrDecryptForm({
  isDecryption,
  file,
  onSubmit,
  onCancel,
}: {
  isDecryption: boolean;
  file: File;
  onSubmit: (filePath: string, password: string) => void;
  onCancel: () => void;
}): React.ReactNode | null {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayError, setDisplayError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Must match the confirmation, and be more than 3 characters
  const validatePassword = () => {
    if (password.length < 4) {
      setDisplayError(true);
      setErrorMessage('Password must be at least 4 characters');
      return false;
    }
    if (password === confirmPassword) {
      setDisplayError(false);
      setErrorMessage('');
      return true;
    }
    setDisplayError(true);
    setErrorMessage("Passwords don't match");
    return false;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (isDecryption) {
        onSubmit(file.path, password);
      } else if (validatePassword()) {
        onSubmit(file.path, password);
      } else {
        // Encryption, passwords don't match
        setDisplayError(true);
        setErrorMessage("Passwords don't match");
      }
    }
  };

  return (
    <>
      <EncryptOrDecryptFileHeader fileName={file.path} />
      <div
        className="formBody"
        style={{ marginTop: isDecryption ? '0px' : '-20px' }}
      >
        <PasswordInput
          placeholder="Enter password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          inErrorMode={displayError}
          onKeyDown={onKeyDown}
          autoFocus
        />
        {!isDecryption ? (
          <PasswordInput
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onKeyDown={onKeyDown}
            inErrorMode={displayError}
            autoFocus={false}
          />
        ) : null}
        {/* Avoid layout shifting when error message is shown by toggling opacity and using a non-breaking space */}
        <span
          className="errorText"
          style={{
            visibility: displayError ? 'visible' : 'hidden',
            opacity: displayError ? 1 : 0,
            height: '14px',
            display: 'block',
          }}
        >
          {errorMessage || '\u00A0'}
        </span>
        <div className="buttonsWrapper">
          <Button
            isPrimary
            onClick={() => {
              if (!isDecryption && validatePassword()) {
                onSubmit(file.path, password);
              } else if (isDecryption) {
                onSubmit(file.path, password);
              }
            }}
          >
            <img
              className="primaryButtonIcon"
              alt="buttonIcon"
              src={isDecryption ? DecryptIcon : EncryptIcon}
            />
            <span className="primaryButtonText">
              {isDecryption ? 'Decrypt' : 'Encrypt'}
            </span>
          </Button>
          <Button isPrimary={false} onClick={() => onCancel()}>
            <span className="cancelButtonText">Cancel</span>
          </Button>
        </div>
      </div>
    </>
  );
}
