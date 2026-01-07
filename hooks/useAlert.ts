'use client';

import { useState, useCallback } from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: AlertVariant;
}

export function useAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  const showAlert = useCallback((title: string, message: string, variant: AlertVariant = 'info') => {
    setAlertState({
      isOpen: true,
      title,
      message,
      variant,
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const showSuccess = useCallback((title: string, message: string) => {
    showAlert(title, message, 'success');
  }, [showAlert]);

  const showError = useCallback((title: string, message: string) => {
    showAlert(title, message, 'error');
  }, [showAlert]);

  const showWarning = useCallback((title: string, message: string) => {
    showAlert(title, message, 'warning');
  }, [showAlert]);

  const showInfo = useCallback((title: string, message: string) => {
    showAlert(title, message, 'info');
  }, [showAlert]);

  return {
    alertState,
    showAlert,
    closeAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
