import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://frfukjvnppdpygnabfpa.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZnVranZucHBkcHlnbmFiZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTY4MTYsImV4cCI6MjA4MDc5MjgxNn0.O0EjqpogoedIq19S8nKwkrKc32ULtkHbEwj9UF7vh2c';

// Cliente para uso no cliente (browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente para uso no servidor (com service role key para bypass RLS)
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

