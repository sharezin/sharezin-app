import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slriuiztkvsviufdehvj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente para uso no cliente (browser) - inicialização lazy para evitar erros durante o build
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    // Se não houver chave, usa uma chave dummy temporária para evitar erro durante o build
    // A chave dummy não será usada em runtime, apenas para passar na validação do Supabase
    const key = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.dummy';
    supabaseInstance = createClient(supabaseUrl, key);
  }
  return supabaseInstance;
}

// Export para compatibilidade com código existente - só cria no cliente
export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null as any;

// Cliente para uso no servidor (com service role key para bypass RLS)
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  
  // Se não houver chave, usa uma chave dummy temporária para evitar erro durante o build
  const key = serviceRoleKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjAwMCwiZXhwIjoxOTYwNzY4MDAwfQ.dummy';
  
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

