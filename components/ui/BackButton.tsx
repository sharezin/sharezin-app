'use client';

import { useRouter } from 'next/navigation';
import { IconButton } from './IconButton';

interface BackButtonProps {
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function BackButton({ href, onClick, className = '' }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <IconButton
      onClick={handleClick}
      aria-label="Voltar"
      className={className}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </IconButton>
  );
}
