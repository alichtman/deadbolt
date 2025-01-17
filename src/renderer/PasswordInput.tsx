import React from 'react';
import { TextField } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface PasswordInputProps {
  inErrorMode: boolean;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  autoFocus: boolean;
  type: 'text' | 'password';
  toggleVisibility: () => void;
}

export default function PasswordInput({
  inErrorMode = false,
  value,
  onChange,
  onKeyDown,
  placeholder,
  autoFocus,
  type,
  toggleVisibility,
}: PasswordInputProps) {
  const EyeIcon = type === 'text' ? Visibility : VisibilityOff;

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
          endAdornment: (
            <EyeIcon
              onClick={toggleVisibility}
              style={{ color: 'var(--text-color-input-placeholder)' }}
            />
          ),
        },
      }}
    />
  );
}
