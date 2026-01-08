'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'ghost';
}

export function IconButton({ 
  children, 
  variant = 'default',
  className = '',
  ...props 
}: IconButtonProps) {
  const baseStyles = 'p-2 rounded-lg transition-colors';
  const variantStyles = {
    default: 'border border-border text-text-primary hover:bg-secondary-hover',
    ghost: 'text-text-primary hover:bg-secondary-hover',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
