'use client';

import { ReactNode, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showCloseButton?: boolean;
}

export function Modal({ isOpen, onClose, title, children, showCloseButton = true }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-end bg-black/50 sm:items-center sm:justify-center backdrop-blur-sm" 
      onClick={onClose}
      style={{ zIndex: 9999, position: 'fixed' }}
    >
      <div
        className="w-full max-w-md bg-surface rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 10000 }}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">
              {title}
            </h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
  disabled?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'primary',
  loading = false,
  disabled = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    if (!loading && !disabled) {
      onConfirm();
      if (!loading) {
        onClose();
      }
    }
  };

  const handleClose = () => {
    if (!loading && !disabled) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} showCloseButton={false}>
      <p className="text-text-secondary mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={handleClose}
          disabled={loading || disabled}
          className="flex-1 px-4 py-3 rounded-lg border border-border text-text-primary hover:bg-secondary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading || disabled}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            confirmVariant === 'danger'
              ? 'bg-error text-text-inverse hover:opacity-90'
              : confirmVariant === 'warning'
              ? 'bg-warning text-text-inverse hover:opacity-90'
              : 'bg-primary text-text-inverse hover:bg-primary-hover'
          }`}
        >
          {loading && (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  variant = 'info',
}: AlertModalProps) {
  const variantStyles = {
    info: 'bg-info/10 border-info/30',
    success: 'bg-success/10 border-success/30',
    warning: 'bg-warning/10 border-warning/30',
    error: 'bg-error/10 border-error/30',
  };

  const variantTextColors = {
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} showCloseButton={false}>
      <div className={`p-4 rounded-lg border mb-6 ${variantStyles[variant]}`}>
        <p className={`${variantTextColors[variant]}`}>{message}</p>
      </div>
      <button
        onClick={onClose}
        className="w-full px-4 py-3 rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors"
      >
        {buttonText}
      </button>
    </Modal>
  );
}

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
}

export function PromptModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  placeholder = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  defaultValue = '',
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);

  const handleConfirm = () => {
    onConfirm(value);
    setValue('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} showCloseButton={false}>
      <p className="text-text-secondary mb-4">{message}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus
        className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary mb-6"
      />
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 rounded-lg border border-border text-text-primary hover:bg-secondary-hover transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={!value.trim()}
          className="flex-1 px-4 py-3 rounded-lg bg-primary text-text-inverse font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

