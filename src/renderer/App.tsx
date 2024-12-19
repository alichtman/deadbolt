import './App.css';
import FileUpload from './FileUpload';
import { useEffect, useState } from 'react';
import EncryptOrDecryptForm from './EncryptOrDecryptForm';
import SucessOrErrorModal from './SuccessOrErrorModal';

export const DEADBOLT_EXTENSION = '.dbolt';

// This is sync'd from src/main/encryptionAndDecryptionLib.ts, but we can't actually import the value here, so we redefine it.
// This follows the DRYUYRHT (Don't Repeat Yourself Unless You Really Have To) principle.
const ERROR_MESSAGE_PREFIX = 'ERROR_FROM_ELECTRON_MAIN_THREAD';

function extractErrorMessageFromErrorString(errorString: string): string {
  const removedPrefix = errorString.replace(`${ERROR_MESSAGE_PREFIX}: `, '');
  return removedPrefix.split('\n')[0];
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
  if (!filePath) return false;
  if (filePath.startsWith(ERROR_MESSAGE_PREFIX)) return false;
  return filePath.endsWith(DEADBOLT_EXTENSION);
}

export default function App() {
  // This is just a handle on the file for the path -- you can't actually read or write to it in the renderer process.
  const [fileToWorkWith, setFileToWorkWith] = useState<File | undefined>(
    undefined,
  );
  const [pathToEncryptedOrDecryptedFile, setPathToEncryptedOrDecryptedFile] =
    useState<string | undefined>(undefined);
  const [viewState, setViewState] = useState<ViewState>(ViewState.FILE_UPLOAD);
  const [fileIsEncrypted, setFileIsEncrypted] = useState(false);
  const [
    fileDecryptOrEncryptErrorMessage,
    setFileDecryptOrEncryptErrorMessage,
  ] = useState<string | undefined>(undefined);

  const resetToFileUpload = () => {
    setViewState(ViewState.FILE_UPLOAD);
    setFileToWorkWith(undefined);
  };

  const revealInFinder = () => {
    window.electronAPI.revealFileInFinder(
      pathToEncryptedOrDecryptedFile,
    ) as Promise<string>;
  };

  const encryptFile = (fileName: string, password: string) => {
    const encryptedFileResult = window.electronAPI.encryptFileRequest(
      fileName,
      password,
    ) as Promise<string>;

    encryptedFileResult.then((resolvedFilePathOrError) => {
      console.log('Resolved file path:', resolvedFilePathOrError);
      if (resolvedFilePathOrError.startsWith(ERROR_MESSAGE_PREFIX)) {
        console.error('Error from encryptFile:', resolvedFilePathOrError);
        setViewState(ViewState.ERROR);
        setFileDecryptOrEncryptErrorMessage(
          extractErrorMessageFromErrorString(resolvedFilePathOrError),
        );
        // setPathToEncryptedOrDecryptedFile(undefined);
        return;
      } else {
        setViewState(ViewState.SUCCESS);
        setFileDecryptOrEncryptErrorMessage(undefined);
        setPathToEncryptedOrDecryptedFile(resolvedFilePathOrError);
      }
    });
  };
  const decryptFile = (fileName: string, password: string) => {
    const decryptedFileResult = window.electronAPI.decryptFileRequest(
      fileName,
      password,
    ) as Promise<string>;

    decryptedFileResult.then((resolvedFilePathOrError) => {
      if (resolvedFilePathOrError.startsWith(ERROR_MESSAGE_PREFIX)) {
        console.error('Error from decryptFile:', resolvedFilePathOrError);
        setViewState(ViewState.ERROR);
        setFileDecryptOrEncryptErrorMessage(
          extractErrorMessageFromErrorString(resolvedFilePathOrError),
        );
        setPathToEncryptedOrDecryptedFile(undefined);
        return;
      } else {
        setViewState(ViewState.SUCCESS);
        setFileDecryptOrEncryptErrorMessage(undefined);
        setPathToEncryptedOrDecryptedFile(resolvedFilePathOrError);
      }
    });
  };

  // When a file is selected, check if it's encrypted and set the right state
  useEffect(() => {
    setFileIsEncrypted(isDeadboltFile(fileToWorkWith?.path));
    console.log('File is encrypted?', fileIsEncrypted);
  }, [fileToWorkWith]);

  let appBody;
  if (viewState === ViewState.FILE_UPLOAD || !fileToWorkWith) {
    appBody = (
      <FileUpload
        setFileToWorkWith={setFileToWorkWith}
        onChange={() => {
          setViewState(ViewState.ENCRYPT_OR_DECRYPT);
        }}
      />
    );
  } else if (viewState === ViewState.ENCRYPT_OR_DECRYPT && !fileIsEncrypted) {
    appBody = (
      <EncryptOrDecryptForm
        file={fileToWorkWith}
        onSubmit={encryptFile}
        onCancel={() => {
          resetToFileUpload();
        }}
        isDecryption={fileIsEncrypted}
      />
    );
  } else if (viewState === ViewState.ENCRYPT_OR_DECRYPT && fileIsEncrypted) {
    appBody = (
      <EncryptOrDecryptForm
        file={fileToWorkWith}
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
    appBody = (
      <SucessOrErrorModal
        onGoHome={() => {
          resetToFileUpload();
        }}
        onRevealInFinder={revealInFinder}
        encryptedOrDecryptedFilePath={pathToEncryptedOrDecryptedFile}
        isSuccess={true}
      />
    );
  } else if (viewState === ViewState.ERROR) {
    // Some error
    appBody = (
      <SucessOrErrorModal
        onGoHome={() => {
          resetToFileUpload();
        }}
        onRevealInFinder={revealInFinder}
        encryptedOrDecryptedFilePath={undefined}
        isSuccess={false}
        errorMessage={fileDecryptOrEncryptErrorMessage}
      />
    );
  }

  return <div className="app">{appBody}</div>;
}
