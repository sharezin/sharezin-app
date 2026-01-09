'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Carrega tema salvo do localStorage
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    let resolved: 'light' | 'dark';

    const applyTheme = (newResolved: 'light' | 'dark') => {
      // Usa setTimeout para evitar setState síncrono dentro de effect
      setTimeout(() => {
        setResolvedTheme(newResolved);
      }, 0);
      if (newResolved === 'dark') {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      resolved = mediaQuery.matches ? 'dark' : 'light';
      
      // Aplica tema inicial
      applyTheme(resolved);

      // Escuta mudanças na preferência do sistema
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        resolved = e.matches ? 'dark' : 'light';
        applyTheme(resolved);
      };

      mediaQuery.addEventListener('change', handleSystemThemeChange);

      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    } else {
      resolved = theme;
      applyTheme(resolved);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
