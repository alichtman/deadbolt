import { FaLock } from 'react-icons/fa';

/* eslint-disable no-alert */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useState, useEffect } from 'react';
import './EncryptOrDecryptFileHeader.css';
import { getIcon } from 'material-file-icons';
import { isDeadboltFile } from './App';
// import deadboltIcon from '../../assets/icon.png';

function FileIcon({
  filename,
  style,
}: {
  filename: string;
  style: React.CSSProperties;
}): React.ReactNode {
  return (
    <div
      style={style}
      // Theoretically exposes XSS risk, however, getIcon always returns an icon type, so this shouldn't be an issue. (Famous last words)
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: getIcon(filename).svg }}
    />
  );
}

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

  return (
    <div className="fileHeader">
      <div className="fileHeaderIcon">
        {isDeadboltFile(fileName) ? (
          <FaLock />
        ) : (
          // <img
          //   src={deadboltIcon}
          //   alt="Deadbolt Icon"
          //   style={{
          //     width: '30px',
          //     height: '30px',
          //     marginTop: '5px',
          //     marginRight: '8px',
          //   }}
          // />
          <FileIcon
            filename={fileName}
            style={{
              transform: 'scale(1.5)',
            }}
          />
        )}
      </div>
      <span
        title={fileName} // Show full filepath on hover
        style={{
          cursor: 'pointer',
          marginLeft: '8px',
          fontFamily: 'monospace',
        }}
        onClick={() => {
          navigator.clipboard.writeText(fileName);
          alert(`Copied full path to clipboard!`);
        }}
      >
        {prettyFilePath}
      </span>
    </div>
  );
}
