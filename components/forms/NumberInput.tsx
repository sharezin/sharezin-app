'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { Input } from '@/components/ui/Input';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
  allowDecimals?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ label, error, onChange, allowDecimals = true, className = '', ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Permite apenas números, vírgula e ponto se allowDecimals for true
      const filteredValue = allowDecimals
        ? value.replace(/[^0-9,.]/g, '')
        : value.replace(/[^0-9]/g, '');
      
      if (onChange) {
        onChange(filteredValue);
      } else {
        // Se não há onChange customizado, atualiza o input diretamente
        e.target.value = filteredValue;
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        label={label}
        error={error}
        onChange={handleChange}
        className={className}
        {...props}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
