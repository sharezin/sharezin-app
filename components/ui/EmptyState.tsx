'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && (
        <div className="mb-4 flex justify-center">
          {icon}
        </div>
      )}
      <p className="text-zinc-600 dark:text-zinc-400 text-lg mb-2">
        {title}
      </p>
      {description && (
        <p className="text-zinc-500 dark:text-zinc-500 text-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}
