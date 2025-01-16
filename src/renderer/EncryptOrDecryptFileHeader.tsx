import React, { useState, useEffect } from 'react';
import { FaLock } from 'react-icons/fa';
import { FileIcon } from 'react-file-icon';
import './EncryptOrDecryptFileHeader.css';

/**
 * Renders a file header component.
 *
 * @param {string} fileName - The name of the file to display in the header.
 * @returns {JSX.Element | null} The file header component, or null if no file name is provided.
 */
export default function EncryptOrDecryptFileHeader({
  fileName,
}: {
  fileName: string;
}): React.ReactNode | null {
  const [prettyFilePath, setPrettyFilePath] = useState<string>(fileName);

  useEffect(() => {
    (window.electronAPI.prettyPrintFilePath(fileName) as Promise<string>)
      .then((result) => setPrettyFilePath(result))
      .catch(() =>
        setPrettyFilePath(
          `Some error occurred getting pretty path for ${fileName}`,
        ),
      );
  }, [fileName]);

  if (!fileName) {
    return null;
  }

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
