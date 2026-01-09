'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { ExpenseDistribution } from '@/hooks/useDashboardStats';
import { formatCurrency } from '@/lib/calculations';

interface ExpenseDistributionChartProps {
  data: ExpenseDistribution[];
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export function ExpenseDistributionChart({ data }: ExpenseDistributionChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Limitar a 8 itens para melhor visualização
    const limitedData = data.slice(0, 8);
    
    return limitedData.map((item, index) => ({
      name: item.receiptTitle.length > 20 
        ? item.receiptTitle.substring(0, 20) + '...' 
        : item.receiptTitle,
      value: Number(item.totalSpent),
      fullName: item.receiptTitle,
      receiptId: item.receiptId,
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
      const data = payload[0];
      return (
        <div className="bg-surface border border-border-strong rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-text-primary mb-1">
            {data.payload.fullName}
          </p>
          <p className="text-sm text-text-secondary">
            Total: <span className="font-semibold text-text-primary">{formatCurrency(data.value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => {
            if (percent < 0.05) return ''; // Não mostrar labels muito pequenos
            return `${(percent * 100).toFixed(0)}%`;
          }}
          outerRadius={80}
          fill="currentColor"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          formatter={(value, entry: any) => {
            const item = chartData.find(d => d.name === value);
            return item ? `${value} (${formatCurrency(item.value)})` : value;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
