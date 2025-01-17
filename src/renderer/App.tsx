/* eslint-disable no-alert */
/* eslint-disable no-else-return */
/* eslint-disable no-console */
import { useState, useEffect } from 'react';
import './App.css';
import CircularProgress from '@mui/material/CircularProgress';
import FileUpload from './FileUpload';
import EncryptOrDecryptForm from './EncryptOrDecryptForm';
import SucessOrErrorModal from './SuccessOrErrorModal';

export const ENCRYPTED_FILE_EXTENSION = '.deadbolt';
export const LEGACY_ENCRYPTED_FILE_EXTENSION = '.dbolt';

// This is sync'd from src/main/encryptionAndDecryptionLib.ts, but we can't actually import the value here, so we redefine it.
// This follows the DRYUYRHT (Don't Repeat Yourself Unless You Really Have To) principle.
const ERROR_MESSAGE_PREFIX = 'ERROR_FROM_ELECTRON_MAIN_THREAD';

function extractErrorMessageFromErrorString(errorString: string): string {
  const removedPrefix = errorString.replace(`${ERROR_MESSAGE_PREFIX}: `, '');
  return removedPrefix.trim();
}

enum ViewState {
  FILE_UPLOAD,
  ENCRYPT_OR_DECRYPT,
  SUCCESS,
  ERROR,
}

/**
 * Checks if the given file path corresponds to a Deadbolt file.
 *
 * @param filePath - The path of the file to check. Can be a string or null.
 * @returns `true` if the file path ends with the Deadbolt file extension, otherwise `false`.
 */
export function isDeadboltFile(filePath: string | undefined): boolean {
  if (!filePath || filePath.startsWith(ERROR_MESSAGE_PREFIX)) {
    return false;
  }

  return (
    filePath.endsWith(ENCRYPTED_FILE_EXTENSION) ||
    filePath.endsWith(LEGACY_ENCRYPTED_FILE_EXTENSION)
  );
}

export default function App() {
  // This is just a handle on the file path
  const [filePathToWorkWith, setFilePathToWorkWith] = useState<
    string | undefined
  >(undefined);
  const [pathToEncryptedOrDecryptedFile, setPathToEncryptedOrDecryptedFile] =
    useState<string | undefined>(undefined);
  const [viewState, setViewState] = useState<ViewState>(ViewState.FILE_UPLOAD);
  const [fileIsEncrypted, setFileIsEncrypted] = useState(false);
  const [
    fileDecryptOrEncryptErrorMessage,
    setFileDecryptOrEncryptErrorMessage,
  ] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const resetToFileUpload = () => {
    setViewState(ViewState.FILE_UPLOAD);
    setFilePathToWorkWith(undefined);
  };

  const revealInFinder = () => {
    window.electronAPI
      .revealFileInFinder(pathToEncryptedOrDecryptedFile)
      .then((result) => {
        console.log('Revealed in finder:', result);
        return result;
      })
      .catch((error) => {
        console.error('Failed to reveal in finder:', error);
        return error;
      });
  };

  const encryptFile = (fileName: string, password: string) => {
    setLoading(true);
    return window.electronAPI
      .encryptFileRequest(fileName, password)
      .then((resolvedFilePathOrError) => {
        setLoading(false);
        console.log('Resolved file path:', resolvedFilePathOrError);
        if (resolvedFilePathOrError.startsWith(ERROR_MESSAGE_PREFIX)) {
          console.error('Error from encryptFile:', resolvedFilePathOrError);
          setViewState(ViewState.ERROR);
          setFileDecryptOrEncryptErrorMessage(
            extractErrorMessageFromErrorString(resolvedFilePathOrError),
          );
          return resolvedFilePathOrError;
        }
        setViewState(ViewState.SUCCESS);
        setFileDecryptOrEncryptErrorMessage(undefined);
        setPathToEncryptedOrDecryptedFile(resolvedFilePathOrError);
        return resolvedFilePathOrError;
      });
  };

  const decryptFile = (fileName: string, password: string) => {
    if (!fileName) {
      setViewState(ViewState.ERROR);
      setFileDecryptOrEncryptErrorMessage(
        'No file path provided for decryption',
      );
      setPathToEncryptedOrDecryptedFile(undefined);
      return Promise.reject(new Error('No file path provided'));
    }
    setLoading(true);
    return window.electronAPI
      .decryptFileRequest(fileName, password)
      .then((resolvedFilePathOrError) => {
        setLoading(false);
        if (resolvedFilePathOrError.startsWith(ERROR_MESSAGE_PREFIX)) {
          console.error('Error from decryptFile:', resolvedFilePathOrError);
          setViewState(ViewState.ERROR);
          setFileDecryptOrEncryptErrorMessage(
            extractErrorMessageFromErrorString(resolvedFilePathOrError),
          );
          setPathToEncryptedOrDecryptedFile(undefined);
          return resolvedFilePathOrError;
        }
        setViewState(ViewState.SUCCESS);
        setFileDecryptOrEncryptErrorMessage(undefined);
        setPathToEncryptedOrDecryptedFile(resolvedFilePathOrError);
        return resolvedFilePathOrError;
      });
  };

  const handleFileSelection = (filePath: string) => {
    const isEncrypted = isDeadboltFile(filePath);
    console.log('File is encrypted?', isEncrypted);
    console.log('File path:', filePath);
    setFilePathToWorkWith(filePath);
    setFileIsEncrypted(isEncrypted);
    setViewState(ViewState.ENCRYPT_OR_DECRYPT);
  };

  useEffect(() => {
    window.electronAPI.handleFileOpen((filePath) => {
      console.log('handleFileOpen', filePath);
      handleFileSelection(filePath);
    });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <CircularProgress />
        <span className="workingText">Working...</span>
      </div>
    );
  }

  if (viewState === ViewState.FILE_UPLOAD || !filePathToWorkWith) {
    return <FileUpload setFilePathToWorkWith={handleFileSelection} />;
  } else if (viewState === ViewState.ENCRYPT_OR_DECRYPT && !fileIsEncrypted) {
    return (
      <EncryptOrDecryptForm
        filePath={filePathToWorkWith}
        onSubmit={encryptFile}
        onCancel={() => {
          resetToFileUpload();
        }}
        isDecryption={fileIsEncrypted}
      />
    );
  } else if (viewState === ViewState.ENCRYPT_OR_DECRYPT && fileIsEncrypted) {
    return (
      <EncryptOrDecryptForm
        filePath={filePathToWorkWith}
        onSubmit={decryptFile}
        onCancel={() => {
          resetToFileUpload();
        }}
        isDecryption={fileIsEncrypted}
      />
    );
  } else if (
    viewState === ViewState.SUCCESS &&
    pathToEncryptedOrDecryptedFile
  ) {
    return (
      <SucessOrErrorModal
        onGoHome={() => {
          if (!pathToEncryptedOrDecryptedFile) {
            resetToFileUpload();
          } else {
            navigator.clipboard
              .writeText(pathToEncryptedOrDecryptedFile)
              .then(() => {
                return alert('File path copied to clipboard!');
              })
              .catch((err) => {
                console.error('Failed to copy: ', err);
              });
            resetToFileUpload();
          }
        }}
        onRevealInFinder={revealInFinder}
        errorMessage={undefined}
        isSuccess
      />
    );
  } else if (viewState === ViewState.ERROR) {
    // Some error
    return (
      <SucessOrErrorModal
        onGoHome={() => {
          resetToFileUpload();
        }}
        onRevealInFinder={revealInFinder}
        isSuccess={false}
        errorMessage={fileDecryptOrEncryptErrorMessage}
      />
    );
  } else {
    return null;
  }
}
