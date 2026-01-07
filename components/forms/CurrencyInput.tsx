'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { NumberInput } from './NumberInput';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
  value?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, error, onChange, value, placeholder = 'Ex: 5,50', ...props }, ref) => {
    return (
      <NumberInput
        ref={ref}
        label={label}
        error={error}
        onChange={onChange}
        value={value}
        placeholder={placeholder}
        allowDecimals={true}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
