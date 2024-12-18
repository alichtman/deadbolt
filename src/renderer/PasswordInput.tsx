import { useState } from 'react';
// import { FaEye } from 'react-icons/fa';
import './PasswordInput.css';

export default function PasswordInput({
  placeholder,
  value,
  onChange,
  inErrorMode,
  onKeyPress,
  autofocus,
}: {
  placeholder?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inErrorMode: boolean;
  onKeyPress?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autofocus?: boolean;
}) {
  // TODO: Add password eye icon to show/hide password

  const [isVisible, setIsVisible] = useState(false);

  // const icon = <FaEye />;
  // const handleToggle = () => {
  //   if (isVisible) {
  //     setIsVisible(false);
  //   } else {
  //     setIsVisible(true);
  //   }
  // };

  return (
    <div className="passwordBarWithVisibilityToggle">
      <input
        className={inErrorMode ? 'inputBarError' : 'inputBar'}
        type={!isVisible ? 'password' : 'text'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoFocus={autofocus}
        onKeyPress={onKeyPress}
      />
      {/* <FaEye /> */}
    </div>
  );
}
