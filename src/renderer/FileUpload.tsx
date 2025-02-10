/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import './FileUpload.css';
import { DropEvent, useDropzone } from 'react-dropzone';
import { FaGithub, FaInfoCircle } from 'react-icons/fa';

import packageInfo from '../../package.json';
import dropFileIcon from './assets/dropFileIcon.svg';

function DeadboltVersionTagAndGithubLink() {
  return (
    <a
      className="versionTag"
      href="https://github.com/alichtman/deadbolt"
      target="_blank"
      rel="noopener noreferrer"
    >
      <FaGithub
        style={{
          marginRight: '8px',
          marginBottom: '2px',
          fontSize: '18px',
        }}
      />
      {`deadbolt v${packageInfo.version}`}
    </a>
  );
}

export default function FileUpload({
  setFileToWorkWith,
}: {
  setFileToWorkWith: (file: File) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onSelectFromFileBrowser = (files: File[], _event: DropEvent) => {
    console.log('File dropped:', files);
    setFileToWorkWith(files[0]);
  };

  // Drag-and-drop doesn't give us the file path, so we need to use this super hacky workaround: https://github.com/react-dropzone/file-selector/issues/10#issuecomment-2482649010
  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    console.log('detected file drop event', event);
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file != null) {
      setFileToWorkWith(file);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDropAccepted: onSelectFromFileBrowser,
    noClick: false,
    useFsAccessApi: false,
  });

  return (
    <>
      <div
        className="fileUploadRoot"
        {...getRootProps()}
        onDrop={onDrop}
        data-testid="dropzone"
        role="button"
        aria-label="Upload file dropzone"
        tabIndex={0} // Added to make the div focusable
      >
        <input {...getInputProps()} data-testid="file-input" />
        <img
          alt="dropFileIcon"
          src={dropFileIcon}
          style={{
            width: '87px',
            height: '100px',
            cursor: 'pointer',
            opacity: '0.75',
          }}
        />

        <span className="fileUploadText">
          Drag-and-drop a file or folder here, <br /> or click to select
          <br />
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '8px',
              fontSize: '12px',
            }}
          >
            <FaInfoCircle style={{ marginRight: '4px' }} />
            Folder encryption is only supported with drag-and-drop
          </span>
        </span>
      </div>
      <DeadboltVersionTagAndGithubLink />
    </>
  );
}
