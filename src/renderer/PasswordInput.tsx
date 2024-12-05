import "./PasswordInput.css";

export default function PasswordInput({
  placeholder,
  value,
  onChange,
  inErrorMode,
  onKeyPress,
  autofocus
}: {
  placeholder?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inErrorMode: boolean;
  onKeyPress?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autofocus?: boolean;
}) {
  return (
    <input
      className={inErrorMode ? "inputBarError" : "inputBar"}
      type="password"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoFocus={autofocus}
      onKeyPress={onKeyPress}
    />
  );
}

