'use client';

import { useMemo } from 'react';
import { RadialBarChart, RadialBar, Cell, Legend } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ExpenseDistribution } from '@/hooks/useDashboardStats';
import { formatCurrency } from '@/lib/calculations';

interface ExpenseDistributionRadialChartProps {
  data: ExpenseDistribution[];
}

// Cores mais distintas e contrastantes
const CHART_COLORS = [
  '#3b82f6', // Azul
  '#10b981', // Verde
  '#f59e0b', // Laranja
  '#ef4444', // Vermelho
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#f97316', // Laranja escuro
];

export function ExpenseDistributionRadialChart({ data }: ExpenseDistributionRadialChartProps) {
  const { chartData, chartConfig } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], chartConfig: {} };
    }

    // Limitar a 5 itens para melhor visualização no gráfico radial
    const limitedData = data.slice(0, 5);
    const total = limitedData.reduce((sum, item) => sum + Number(item.totalSpent), 0);
    
    const processedData = limitedData.map((item, index) => {
      const value = Number(item.totalSpent);
      const percentage = total > 0 ? (value / total) * 100 : 0;
      
      return {
        name: item.receiptTitle.length > 20 
          ? item.receiptTitle.substring(0, 20) + '...' 
          : item.receiptTitle,
        fullName: item.receiptTitle,
        value: value,
        fill: CHART_COLORS[index % CHART_COLORS.length],
        receiptId: item.receiptId,
        percentage: percentage.toFixed(1),
        key: `receipt-${index}`,
      };
    });

    // Criar config dinâmica baseado nos dados
    const config: ChartConfig = {};
    processedData.forEach((item, index) => {
      const color = CHART_COLORS[index % CHART_COLORS.length];
      config[item.key] = {
        label: item.name,
        color: color,
      };
    });

    return { chartData: processedData, chartConfig: config };
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
            {data.fullName}
          </p>
          <p className="text-sm text-text-secondary">
            Total: <span className="font-semibold text-text-primary">{formatCurrency(data.value)}</span>
          </p>
          <p className="text-xs text-text-muted mt-1">
            {data.percentage}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ChartContainer config={chartConfig} className="min-h-[250px] w-full aspect-square">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="30%"
          outerRadius="90%"
          barSize={20}
          data={chartData}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={4}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </RadialBar>
          <ChartTooltip content={<CustomTooltip />} />
        </RadialBarChart>
      </ChartContainer>
      
      {/* Legenda customizada vertical */}
      <div className="flex flex-col gap-2 mt-4 px-2">
        {chartData.map((item, index) => (
          <div
            key={item.receiptId}
            className="flex items-center gap-2 text-xs"
          >
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-text-secondary">
              {item.name}
            </span>
            <span className="ml-auto font-medium text-text-primary">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
