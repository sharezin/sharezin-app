import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configurações experimentais para melhorar o build
  experimental: {
    // Otimiza a compilação de rotas
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  
  // Configurações de compilação
  compiler: {
    // Remove console.log em produção (opcional)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

export default nextConfig;
