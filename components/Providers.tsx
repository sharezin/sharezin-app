'use client';

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { RouteGuard } from "@/components/RouteGuard";
import { BottomNav } from "@/components/BottomNav";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouteGuard>
          {children}
          <BottomNav />
        </RouteGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}
