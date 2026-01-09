'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-surface rounded-lg p-4 border border-border-strong">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-text-secondary">{title}</p>
        {icon && (
          <div className="text-text-muted">
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-text-primary">
        {value}
      </p>
      {trend && trend !== 'neutral' && (
        <div className={`mt-2 flex items-center gap-1 text-xs ${
          trend === 'up' ? 'text-success' : 'text-error'
        }`}>
          <svg
            className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
          <span>vs mês anterior</span>
        </div>
      )}
    </div>
  );
}
