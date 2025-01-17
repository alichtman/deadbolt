import React, { useEffect, useState } from 'react';
import './EncryptOrDecryptForm.css';
import { FileIcon } from 'react-file-icon';
// import { getClassWithColor } from 'file-icons-js';
// import 'file-icons-js/css/style.css';
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
      } else if (validatePassword()) {
        onSubmit(file.path, password);
      } else {
        // Encryption, passwords don't match
        setDisplayError(true);
        setErrorMessage("Passwords don't match");
      }
    }
  };

  // Must match the confirmation, and be more than 3 characters
  const validatePassword = () => {
    if (password.length < 4) {
      setDisplayError(true);
      setErrorMessage('Password must be at least 4 characters');
      return false;
    } else if (password === confirmPassword) {
      setDisplayError(false);
      setErrorMessage('');
      return true;
    } else {
      setDisplayError(true);
      setErrorMessage("Passwords don't match");
      return false;
    }
  };

  return (
    <>
      <FileHeader fileName={file.path} />
      <div className="formBody">
        <PasswordInput
          placeholder="Enter password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          inErrorMode={displayError}
          onKeyPress={onKeyPress}
          autofocus={true}
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
  const [prettyFilePath, setPrettyFilePath] = useState<string>(fileName);
  if (!fileName) {
    return null;
  }
  // This looks gross, but ... direct consequences of choosing to write this on top of Electron
  // We can't import ths os module (or anything that interacts with the filesystem) in the renderer process.

  useEffect(() => {
    (window.electronAPI.prettyPrintFilePath(fileName) as Promise<string>).then(
      (result) => setPrettyFilePath(result),
    );
  }, [fileName]);

  // const iconClassName = getClassWithColor(fileName);

  const extension: string = fileName.split('.').pop() || '';

  return (
    <div className="fileHeader">
      <div className="fileHeaderImage">
        {fileName.endsWith('.dbolt') ? (
          <FaLock />
        ) : (
          // TODO: Switch to using the old icon, once you fix the sizing issue (the icons show up really small for some reason, idk)
          // <span className={iconClassName} id="fileIcon" />
          <FileIcon extension={extension} type="presentation" />
        )}
      </div>
      <span
        className={
          fileName.endsWith('.dbolt') ? 'filePathEncrypted' : 'filePath'
        }
        title={fileName} // Show full filepath on hover
      >
        {prettyFilePath}
      </span>
    </div>
  );
}
