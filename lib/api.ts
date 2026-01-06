/**
 * Utilitários para fazer requisições autenticadas à API
 */

/**
 * Obtém o token de autenticação do localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Faz uma requisição autenticada à API
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `Erro ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Transforma um objeto de snake_case para camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Transforma um objeto de camelCase para snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Transforma recursivamente um objeto de snake_case para camelCase
 */
export function transformToCamelCase<T>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformToCamelCase(item)) as T;
  }
  
  if (typeof obj !== 'object') return obj;
  
  const transformed: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key);
      transformed[camelKey] = transformToCamelCase(obj[key]);
    }
  }
  
  return transformed as T;
}

/**
 * Transforma recursivamente um objeto de camelCase para snake_case
 */
export function transformToSnakeCase<T>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformToSnakeCase(item)) as T;
  }
  
  if (typeof obj !== 'object') return obj;
  
  const transformed: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key);
      transformed[snakeKey] = transformToSnakeCase(obj[key]);
    }
  }
  
  return transformed as T;
}
