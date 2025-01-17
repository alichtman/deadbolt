import React, { useState } from 'react';
import './EncryptOrDecryptForm.css';
import CancelIcon from '@mui/icons-material/Cancel';
import PasswordInput from './PasswordInput';
import Button from './Button';
import DecryptIcon from './assets/decryptIcon.svg';
import EncryptIcon from './assets/encryptIcon.svg';
import EncryptOrDecryptFileHeader from './EncryptOrDecryptFileHeader';

export default function EncryptOrDecryptForm({
  isDecryption,
  filePath,
  onSubmit,
  onCancel,
}: {
  isDecryption: boolean;
  filePath: string;
  onSubmit: (filePath: string, password: string) => void;
  onCancel: () => void;
}): React.ReactNode | null {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayError, setDisplayError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Must match the confirmation, and longer than 8 characters
  const validatePassword = () => {
    if (password.length < 8) {
      setDisplayError(true);
      setErrorMessage('Password must be at least 8 characters');
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
        onSubmit(filePath, password);
      } else if (validatePassword()) {
        onSubmit(filePath, password);
      } else {
        // Encryption, passwords don't match
        setDisplayError(true);
        setErrorMessage("Passwords don't match");
      }
    }
  };

  const passwordVisibilityType = isPasswordVisible ? 'text' : 'password';

  return (
    <>
      <EncryptOrDecryptFileHeader fileName={filePath} />

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
          type={passwordVisibilityType}
          toggleVisibility={() => setIsPasswordVisible(!isPasswordVisible)}
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
            type={passwordVisibilityType}
            toggleVisibility={() => setIsPasswordVisible(!isPasswordVisible)}
          />
        ) : null}
        {/* Avoid layout shifting when error message is shown by toggling opacity and using a non-breaking space */}
        <span
          className="errorText"
          style={{
            width: '100%',
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
            buttonType="primary"
            onClick={() => {
              if (!isDecryption && validatePassword()) {
                onSubmit(filePath, password);
              } else if (isDecryption) {
                onSubmit(filePath, password);
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
          <Button buttonType="cancel" onClick={() => onCancel()}>
            <CancelIcon
              style={{
                fontSize: '16px',
                marginRight: '4px',
                marginBottom: '4px',
              }}
            />
            <span className="cancelButtonText">Cancel</span>
          </Button>
        </div>
      </div>
    </>
  );
}
