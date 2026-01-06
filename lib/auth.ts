import { NextRequest } from 'next/server';
import { createServerClient } from './supabase';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Decodificar token JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      // Se não for JWT válido, tentar como base64 (para compatibilidade)
      try {
        const decodedBase64 = JSON.parse(Buffer.from(token, 'base64').toString());
        decoded = decodedBase64;
      } catch {
        return null;
      }
    }

    if (!decoded || !decoded.userId) {
      return null;
    }

    const supabase = createServerClient();
    
    // Buscar dados do usuário na tabela sharezin_users
    const { data: userData, error: userError } = await supabase
      .from('sharezin_users')
      .select('id, name, email')
      .eq('id', decoded.userId)
      .single();

    if (userError || !userData) {
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
    };
  } catch (error) {
    return null;
  }
}

export function createAuthResponse(message: string, status: number = 401) {
  return Response.json(
    { error: 'Unauthorized', message },
    { status }
  );
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

