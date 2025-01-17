import React from 'react';
import './FileUpload.css';
import { DropEvent, useDropzone } from 'react-dropzone';
import { FaGithub } from 'react-icons/fa';

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
      <div className="fileUploadRoot" {...getRootProps()} onDrop={onDrop}>
        <input {...getInputProps()} />
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
          Drag-and-drop a file here, <br /> or click to select
        </span>
      </div>
      <DeadboltVersionTagAndGithubLink />
    </>
  );
}
