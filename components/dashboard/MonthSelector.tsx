'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MonthSelectorProps {
  availableMonths: { value: string; label: string }[];
  selectedYear: string | null;
  selectedMonth: string | null;
  onYearChange: (year: string | null) => void;
  onMonthChange: (month: string | null) => void;
}

export function MonthSelector({ 
  availableMonths, 
  selectedYear, 
  selectedMonth, 
  onYearChange, 
  onMonthChange 
}: MonthSelectorProps) {
  // Extrair anos únicos dos meses disponíveis
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    availableMonths.forEach((month) => {
      const parts = month.value.split('-');
      if (parts[0]) {
        years.add(parts[0]);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a)); // Mais recente primeiro
  }, [availableMonths]);

  // Filtrar meses baseado no ano selecionado
  const filteredMonths = useMemo(() => {
    if (!selectedYear) return availableMonths;
    return availableMonths.filter((month) => month.value.startsWith(selectedYear));
  }, [availableMonths, selectedYear]);

  const handleYearChange = (value: string) => {
    try {
      const newYear = value === 'all' ? null : value;
      // Resetar mês se necessário antes de atualizar o ano
      if (selectedMonth && newYear) {
        const monthYear = selectedMonth.split('-')[0];
        if (monthYear !== newYear) {
          onMonthChange(null);
        }
      } else if (!newYear) {
        // Se voltar para "Todos os anos", resetar mês
        onMonthChange(null);
      }
      // Atualizar ano
      onYearChange(newYear);
    } catch (error) {
      // Erro ao mudar ano
    }
  };

  const handleMonthChange = (value: string) => {
    try {
      onMonthChange(value === 'all' ? null : value);
    } catch (error) {
      // Erro ao mudar mês
    }
  };

  // Garantir que o valor do Select seja válido
  const yearValue = useMemo(() => {
    if (!selectedYear) return 'all';
    return availableYears.includes(selectedYear) ? selectedYear : 'all';
  }, [selectedYear, availableYears]);
  
  const monthValue = useMemo(() => {
    if (!selectedMonth) return 'all';
    return filteredMonths.some(m => m.value === selectedMonth) ? selectedMonth : 'all';
  }, [selectedMonth, filteredMonths]);

  return (
    <div className="mb-4 flex gap-2">
      <Select
        value={yearValue}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="flex-1 bg-surface border-border-strong text-text-primary hover:bg-surface-alt data-[placeholder]:text-text-muted focus:ring-2 focus:ring-primary focus:ring-offset-0">
          <SelectValue placeholder="Todos os anos" />
        </SelectTrigger>
        <SelectContent className="bg-surface border-border-strong text-text-primary">
          <SelectItem 
            value="all" 
            className="text-text-primary focus:bg-surface-alt focus:text-text-primary"
          >
            Todos os anos
          </SelectItem>
          {availableYears.map((year) => (
            <SelectItem
              key={year}
              value={year}
              className="text-text-primary focus:bg-surface-alt focus:text-text-primary"
            >
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        key={`month-select-${selectedYear || 'all'}`}
        value={monthValue}
        onValueChange={handleMonthChange}
        disabled={selectedYear !== null && filteredMonths.length === 0}
      >
        <SelectTrigger className="flex-1 bg-surface border-border-strong text-text-primary hover:bg-surface-alt data-[placeholder]:text-text-muted focus:ring-2 focus:ring-primary focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
          <SelectValue placeholder="Todos os meses" />
        </SelectTrigger>
        <SelectContent className="bg-surface border-border-strong text-text-primary">
          <SelectItem 
            value="all" 
            className="text-text-primary focus:bg-surface-alt focus:text-text-primary"
          >
            Todos os meses
          </SelectItem>
          {filteredMonths.map((month) => (
            <SelectItem
              key={month.value}
              value={month.value}
              className="text-text-primary focus:bg-surface-alt focus:text-text-primary"
            >
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
