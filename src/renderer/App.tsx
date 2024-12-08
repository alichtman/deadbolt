import './App.css';
import FileUpload from './FileUpload';
import { useEffect, useState } from 'react';
import EncryptOrDecryptForm from './EncryptOrDecryptForm';
import SucessOrErrorModal from './SuccessOrErrorModal';

export const DEADBOLT_EXTENSION = '.dbolt';

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
  return filePath.endsWith(DEADBOLT_EXTENSION);
}

export default function App() {
  // This is just a handle on the file for the path -- you can't actually read or write to it in the renderer process.
  const [fileToWorkWith, setFileToWorkWith] = useState<File | undefined>(
    undefined,
  );
  const [pathToEncryptedFile, setPathToEncryptedFile] = useState<string | null>(
    null,
  );
  const [viewState, setViewState] = useState<ViewState>(ViewState.FILE_UPLOAD);
  const [fileIsEncrypted, setFileIsEncrypted] = useState(false);

  const encryptFile = (fileName: string, password: string) =>
    window.electronAPI.encryptFileRequest(
      fileName,
      password,
    ) as Promise<string>;
  const decryptFile = (fileName: string, password: string) =>
    window.electronAPI.decryptFileRequest(
      fileName,
      password,
    ) as Promise<string>;

  useEffect(() => {
    console.log('Inside useEffect -- fileToWorkWith:', fileToWorkWith);
    setFileIsEncrypted(isDeadboltFile(fileToWorkWith?.path));
    console.log('File is encrypted!!', fileIsEncrypted);
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
        onSubmit={(fileName, password) => {
          encryptFile(fileName, password).then((response) => {
            if (response.startsWith('ERROR!!')) {
              console.error('Error from encryptFile:', response);
              setViewState(ViewState.ERROR);
              return;
            }

            if (isDeadboltFile(response)) {
              console.log('SUCCESS! Response from encryptFile:', response);
              setPathToEncryptedFile(response);
              setViewState(ViewState.SUCCESS);
            }
          });
        }}
        onCancel={() => {
          setViewState(ViewState.FILE_UPLOAD);
          setFileToWorkWith(undefined);
        }}
        isDecryption={fileIsEncrypted}
      />
    );
  } else if (viewState === ViewState.ENCRYPT_OR_DECRYPT && fileIsEncrypted) {
    appBody = (
      <EncryptOrDecryptForm
        file={fileToWorkWith}
        onSubmit={decryptFile}
        onCancel={() => ViewState.FILE_UPLOAD}
        isDecryption={fileIsEncrypted}
      />
    );
  } else if (viewState === ViewState.SUCCESS && pathToEncryptedFile) {
    appBody = (
      <SucessOrErrorModal
        onGoHome={() => {
          setViewState(0);
          setFileToWorkWith(undefined);
        }}
        encryptedFilePath={pathToEncryptedFile}
        isSuccess={true}
      />
    );
  } else if (viewState === ViewState.ERROR) {
    // Some error
    appBody = (
      <SucessOrErrorModal
        onGoHome={() => {
          setViewState(0);
          setFileToWorkWith(undefined);
        }}
        encryptedFilePath={undefined}
        isSuccess={false}
      />
    );
  }

  return (
    <div className="app">
      <br />

      {appBody}
    </div>
  );
}
