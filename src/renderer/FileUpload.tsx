import './FileUpload.css';
import { DropEvent, useDropzone } from 'react-dropzone';

import packageInfo from '../../package.json';
import dropFileIcon from './assets/dropFileIcon.svg';

export default function FileUpload({
  setFileToWorkWith,
  onChange,
}: {
  setFileToWorkWith: (file: File) => void;
  onChange: () => void;
}) {
  const onDropAccepted = (files: File[], _event: DropEvent) => {
    setFileToWorkWith(files[0]);
    console.log(files[0]);
    onChange();
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDropAccepted,
    noClick: false,
  });

  return (
    <div className="fileUploadRoot" {...getRootProps()}>
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
      <span className="versionTag">{`deadbolt v${packageInfo.version}`}</span>
    </div>
  );
}
