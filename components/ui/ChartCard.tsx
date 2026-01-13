'use client';

import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-surface rounded-lg p-6 border border-border-strong w-full">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        {title}
      </h3>
      <div className="min-h-[200px] w-full overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
