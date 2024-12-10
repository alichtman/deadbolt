import { Fragment } from 'react';
import './SuccessOrErrorModal.css';

import Lottie from 'react-lottie';
import errorAnimationData from './assets/error-animation.json';
import checkmarkAnimationData from './assets/checkmark-animation.json';

import Button from './Button';

// TODO: Add native file drag and drop: https://www.electronjs.org/docs/latest/tutorial/native-file-drag-drop

export default function SuccessOrErrorModal({
  onGoHome,
  onRevealInFinder,
  isSuccess,
  errorMessage,
}: {
  onGoHome: () => void;
  onRevealInFinder: () => void;
  encryptedOrDecryptedFilePath?: string;
  isSuccess: boolean;
  errorMessage?: string;
}) {
  const animationOptions = {
    loop: false,
    autoplay: true,
    animationData: isSuccess ? checkmarkAnimationData : errorAnimationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };

  const mainText = isSuccess ? 'Success!' : 'Something went wrong!';

  return (
    <Fragment>
      <div className="successBody">
        <Lottie options={animationOptions} height={100} width={200} />
        <span className="successText">{mainText}</span>
        <div className="buttonsWrapper">
          {isSuccess && (
            <Button
              isPrimary={true}
              onClick={() => {
                // TODO: Expose this as an IPC thing
                onRevealInFinder();
                // shell.showItemInFolder(encryptedFilePath);
              }}
            >
              <span className="openFinderText">Reveal in Finder</span>
            </Button>
          )}
          {!isSuccess && <p>{errorMessage}</p>}
          <Button isPrimary={false} onClick={onGoHome}>
            <span className="backToQuickLockText">Back to Home</span>
          </Button>
        </div>
      </div>
    </Fragment>
  );
}
