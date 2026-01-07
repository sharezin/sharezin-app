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
    default: 'border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800',
    ghost: 'text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800',
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
