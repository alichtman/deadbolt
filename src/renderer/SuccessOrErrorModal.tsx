import './SuccessOrErrorModal.css';

import Lottie from 'react-lottie';
import errorAnimationData from './assets/error-animation.json';
import checkmarkAnimationData from './assets/checkmark-animation.json';

import Button from './Button';

// TODO: Add native file drag and drop for created files: https://www.electronjs.org/docs/latest/tutorial/native-file-drag-drop

export default function SuccessOrErrorModal({
  onGoHome,
  onRevealInFinder,
  isSuccess,
  errorMessage,
}: {
  onGoHome: () => void;
  onRevealInFinder: () => void;
  isSuccess: boolean;
  errorMessage: string | undefined;
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

  const revealInFinderButton = isSuccess && (
    <Button
      buttonType="primary"
      onClick={() => {
        onRevealInFinder();
      }}
    >
      <span className="openFinderText">Reveal in file browser</span>
    </Button>
  );
  const goHomeWithOptionalCopyToClipboard = isSuccess ? (
    <Button buttonType="goHome" onClick={onGoHome}>
      <span className="backToHomeText">
        Copy encrypted file path to clipboard and go home
      </span>
    </Button>
  ) : (
    <Button buttonType="goHome" onClick={onGoHome}>
      <span className="backToHomeText">Return home</span>
    </Button>
  );

  return (
    <div className="successOrErrorBody">
      <Lottie options={animationOptions} height={100} width={200} />
      <span className="successOrErrorHeaderText">{mainText}</span>
      {!isSuccess && errorMessage && (
        <p className="errorText">
          {errorMessage.split('`').map(
            (part, index) =>
              index % 2 === 0 ? part : <code className="filePath">{part}</code>, // Split on backticks and render the text as code
          )}
        </p>
      )}
      <div className="buttonsWrapper">
        {revealInFinderButton}
        {goHomeWithOptionalCopyToClipboard}
      </div>
    </div>
  );
}
