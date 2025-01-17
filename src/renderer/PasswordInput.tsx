import React, { useState } from 'react';
import { TextField } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface PasswordInputProps {
  inErrorMode: boolean;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  autoFocus: boolean;
}

export default function PasswordInput({
  inErrorMode = false,
  value,
  onChange,
  onKeyDown,
  placeholder,
  autoFocus,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  const type = isVisible ? 'text' : 'password';
  const Icon = isVisible ? Visibility : VisibilityOff;

  return (
    <TextField
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      size="small"
      type={type}
      error={inErrorMode}
      sx={{ margin: '4px' }}
      slotProps={{
        input: {
          endAdornment: <Icon onClick={() => setIsVisible(!isVisible)} />,
        },
      }}
    />
  );
}
