'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ExpenseByPeriod, ExpenseByDay } from '@/hooks/useDashboardStats';
import { formatCurrency } from '@/lib/calculations';
import { MonthSelector } from './MonthSelector';

interface ExpensesByPeriodChartProps {
  data: ExpenseByPeriod[];
  dailyData?: ExpenseByDay[];
}

export function ExpensesByPeriodChart({ data, dailyData = [] }: ExpensesByPeriodChartProps) {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const handleYearChange = useCallback((year: string | null) => {
    setSelectedYear(year);
    // Resetar mês quando ano mudar se o mês não pertencer ao novo ano
    setSelectedMonth((prevMonth) => {
      if (prevMonth && year) {
        const monthYear = prevMonth.split('-')[0];
        return monthYear === year ? prevMonth : null;
      }
      return prevMonth;
    });
  }, []);

  const handleMonthChange = (month: string | null) => {
    setSelectedMonth(month);
  };

  // Gerar lista de meses disponíveis a partir dos dados mensais
  const availableMonths = useMemo(() => {
    return data
      .filter((item) => item.period)
      .map((item) => {
        try {
          const parts = item.period.split('-');
          const month = parseInt(parts[1], 10);
          const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          return {
            value: item.period,
            label: monthNames[month - 1], // Nome completo do mês, sem o ano
          };
        } catch {
          return { value: item.period, label: item.period };
        }
      });
  }, [data]);

  // Filtrar dados diários por ano e mês selecionados (no frontend)
  const filteredDailyData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];
    
    let filtered = dailyData;
    
    // Filtrar por ano se selecionado
    if (selectedYear) {
      filtered = filtered.filter((item) => item.day.startsWith(selectedYear));
    }
    
    // Filtrar por mês se selecionado
    if (selectedMonth) {
      filtered = filtered.filter((item) => item.day.startsWith(selectedMonth));
    }
    
    return filtered;
  }, [selectedYear, selectedMonth, dailyData]);

  // Gerar dados para gráfico mensal (filtrar por ano se selecionado)
  const monthlyChartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let filteredData = data.filter((item) => item.period);
    
    // Filtrar por ano se selecionado
    if (selectedYear) {
      filteredData = filteredData.filter((item) => item.period.startsWith(selectedYear));
    }

    return filteredData.map((item) => {
      let label = item.period;
      try {
        const parts = item.period.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        label = `${monthNames[month - 1]}/${year}`;
      } catch (error) {
        console.warn('Erro ao formatar período:', item.period, error);
      }

      return {
        period: item.period,
        total: Number(item.total),
        label,
      };
    });
  }, [data, selectedYear]);

  // Gerar dados para gráfico diário
  const dailyChartData = useMemo(() => {
    if (!filteredDailyData || filteredDailyData.length === 0) return [];

    // Gerar todos os dias do mês selecionado
    if (!selectedMonth) return [];

    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysMap = new Map<number, { day: number; total: number; label: string }>();

    // Preencher com dados existentes
    filteredDailyData.forEach((item) => {
      const day = parseInt(item.day.split('-')[2], 10);
      daysMap.set(day, {
        day,
        total: Number(item.total),
        label: day.toString().padStart(2, '0'),
      });
    });

    // Preencher dias sem dados com total 0
    for (let day = 1; day <= daysInMonth; day++) {
      if (!daysMap.has(day)) {
        daysMap.set(day, {
          day,
          total: 0,
          label: day.toString().padStart(2, '0'),
        });
      }
    }

    return Array.from(daysMap.values()).sort((a, b) => a.day - b.day);
  }, [filteredDailyData, selectedMonth]);

  // Decidir qual gráfico mostrar
  // Mostrar gráfico diário apenas se mês específico estiver selecionado
  const chartData = selectedMonth ? dailyChartData : monthlyChartData;
  const isDailyView = !!selectedMonth;

  if ((!data || data.length === 0) && (!dailyData || dailyData.length === 0)) {
    return (
      <div className="text-center text-text-muted py-8">
        <p className="text-sm">Nenhum dado disponível</p>
      </div>
    );
  }

  if (isDailyView && (!filteredDailyData || filteredDailyData.length === 0)) {
    return (
      <div>
        <MonthSelector
          availableMonths={availableMonths}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={handleYearChange}
          onMonthChange={handleMonthChange}
        />
        <div className="text-center text-text-muted py-8">
          <p className="text-sm">Nenhum dado disponível para este mês</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateLabel = isDailyView && selectedMonth
        ? (() => {
            const [year, month] = selectedMonth.split('-').map(Number);
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            return `${data.day} de ${monthNames[month - 1]} de ${year}`;
          })()
        : data.label;
      
      return (
        <div className="bg-surface border border-border-strong rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-text-primary mb-1">
            {dateLabel}
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
    <div className="w-full">
      <MonthSelector
        availableMonths={availableMonths}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearChange={handleYearChange}
        onMonthChange={handleMonthChange}
      />
      <div className="w-full" style={{ width: '100%', minWidth: 0, overflow: 'visible' }}>
        <ResponsiveContainer width="100%" height={250} minWidth={0}>
      <BarChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: isDailyView ? 5 : 60 }} barCategoryGap={isDailyView ? "10%" : "5%"}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
        <XAxis
          dataKey="label"
          stroke="currentColor"
          className="text-xs"
          tick={{ fill: 'currentColor', fontSize: isDailyView ? 10 : 12 }}
          angle={isDailyView ? 0 : -45}
          textAnchor={isDailyView ? 'middle' : 'end'}
          height={isDailyView ? 40 : 60}
          interval={isDailyView ? Math.ceil(chartData.length / 10) : 0}
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
          maxBarSize={isDailyView ? 40 : undefined}
        />
      </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
