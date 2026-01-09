'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ExpenseByPeriod } from '@/hooks/useDashboardStats';
import { formatCurrency } from '@/lib/calculations';

interface ExpensesByPeriodChartProps {
  data: ExpenseByPeriod[];
}

export function ExpensesByPeriodChart({ data }: ExpensesByPeriodChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((item) => ({
      period: item.period,
      total: Number(item.total),
      // Formatar período para exibição (ex: "2026-01" -> "Jan/2026")
      label: new Date(item.period + '-01').toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      }),
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-text-muted py-8">
        <p className="text-sm">Nenhum dado disponível</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface border border-border-strong rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-text-primary mb-1">
            {data.label}
          </p>
          <p className="text-sm text-text-secondary">
            Total: <span className="font-semibold text-text-primary">{formatCurrency(data.total)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
        <XAxis
          dataKey="label"
          stroke="currentColor"
          className="text-xs"
          tick={{ fill: 'currentColor', fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          stroke="currentColor"
          className="text-xs"
          tick={{ fill: 'currentColor', fontSize: 12 }}
          tickFormatter={(value) => {
            if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
            return `R$ ${value}`;
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="total"
          fill="currentColor"
          className="text-primary"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
