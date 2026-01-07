import { SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export interface UserData {
  id: string;
  name: string;
  email: string;
}

/**
 * Busca usuário por email
 */
export async function findUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<UserData | null> {
  const { data: user, error } = await supabase
    .from('sharezin_users')
    .select('id, name, email')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Busca usuário com hash de senha para validação
 */
export async function findUserWithPassword(
  supabase: SupabaseClient,
  email: string
): Promise<(UserData & { password_hash: string }) | null> {
  const { data: user, error } = await supabase
    .from('sharezin_users')
    .select('id, name, email, password_hash')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Verifica se email já existe
 */
export async function emailExists(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data: existingUser } = await supabase
    .from('sharezin_users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  return !!existingUser;
}

/**
 * Valida senha
 */
export async function validatePassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/**
 * Gera hash da senha
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Cria novo usuário
 */
export async function createUser(
  supabase: SupabaseClient,
  name: string,
  email: string,
  passwordHash: string
): Promise<UserData> {
  const { data: user, error } = await supabase
    .from('sharezin_users')
    .insert({
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
    })
    .select('id, name, email, created_at')
    .single();

  if (error || !user) {
    throw new Error('Erro ao criar usuário');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
