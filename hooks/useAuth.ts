'use client';

// Re-export do useAuth do Context para manter compatibilidade
// Agora o estado de autenticação é compartilhado globalmente via Context
export { useAuth, AuthProvider } from '@/contexts/AuthContext';
