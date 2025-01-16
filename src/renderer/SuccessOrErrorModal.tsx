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
  errorMessage: string;
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
    <div className="successOrErrorBody">
      <Lottie options={animationOptions} height={100} width={200} />
      <span className="successOrErrorHeaderText">{mainText}</span>
      {!isSuccess && <p className="errorText">{errorMessage}</p>}
      <div className="buttonsWrapper">
        {isSuccess && (
          <Button
            isPrimary
            onClick={() => {
              onRevealInFinder();
            }}
          >
            <span className="openFinderText">Reveal in Finder</span>
          </Button>
        )}
        <Button isPrimary={false} onClick={onGoHome}>
          <span className="backToHomeText">Back to Home</span>
        </Button>
      </div>
    </div>
  );
}
