import React, { useState } from 'react';
import './EncryptOrDecryptForm.css';
import { FileIcon } from 'react-file-icon';
import { FaLock } from 'react-icons/fa';
import PasswordInput from './PasswordInput';
import Button from './Button';
import DecryptIcon from './assets/decryptIcon.svg';
import EncryptIcon from './assets/encryptIcon.svg';

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

  const onKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (isDecryption) {
        onSubmit(file.path, password);
      } else if (password === confirmPassword) {
        onSubmit(file.path, password);
      } else {
        // Encryption, passwords don't match
        setDisplayError(true);
        setErrorMessage("Passwords don't match");
      }
    }
  };

  return (
    <div className="modal">
      <FileHeader fileName={file.path} />
      <div className="formBody">
        <PasswordInput
          placeholder="Enter password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          inErrorMode={displayError}
          onKeyPress={onKeyPress}
          autofocus
        />
        {!isDecryption ? (
          <PasswordInput
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onKeyPress={onKeyPress}
            inErrorMode={displayError}
          />
        ) : null}
        {displayError ? (
          <span className="errorText">{errorMessage}</span>
        ) : null}
        <div className="buttonsWrapper">
          <Button
            isPrimary={true}
            onClick={() => onSubmit(file.path, password)}
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
            <span className="abortButtonText">Cancel</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a file header component.
 *
 * @param {string} fileName - The name of the file to display in the header.
 * @returns {JSX.Element | null} The file header component, or null if no file name is provided.
 */
function FileHeader({
  fileName,
}: {
  fileName: string;
}): React.ReactNode | null {
  if (!fileName) {
    return null;
  }
  return (
    <div className="fileHeader">
      <span className="filepathwrapper">
        {fileName.endsWith('.dbolt') ? (
          <FaLock />
        ) : (
          <FileIcon extension={fileName.split('.').pop()} />
        )}
        <span
          className={
            fileName.endsWith('.dbolt') ? 'filePathEncrypted' : 'filePath'
          }
        >
          {fileName}
        </span>
      </span>
    </div>
  );
}
