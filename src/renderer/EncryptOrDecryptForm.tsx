import React, { useMemo, useState } from 'react';
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
            <span className="cancelButtonText">Cancel</span>
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
  const [prettyFilePath, setPrettyFilePath] = useState<string | undefined>(
    fileName,
  );
  if (!fileName) {
    return null;
  }
  // This looks gross, but ... direct consequences of choosing to write this on top of Electron
  // We can't import ths os module (or anything that interacts with the filesystem) in the renderer process.

  // TODO: Pass the window width in here to figure out where to middle truncate to make the path fit.
  //       Currently, we swap out $HOME at the beginning, and then pray that it all fits.
  const prettyFilePathMemoized = useMemo(() => {
    return (
      window.electronAPI.prettyPrintFilePath(fileName) as Promise<string>
    ).then((result) => setPrettyFilePath(result));
  }, [fileName]);

  return (
    <div className="fileHeader">
      <div className="fileHeaderImage">
        {fileName.endsWith('.dbolt') ? (
          <FaLock />
        ) : (
          <FileIcon extension={fileName.split('.').pop()} />
        )}
      </div>
      <span
        className={
          fileName.endsWith('.dbolt') ? 'filePathEncrypted' : 'filePath'
        }
      >
        {prettyFilePath}
      </span>
    </div>
  );
}
