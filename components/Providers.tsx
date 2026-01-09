'use client';

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ReceiptsProvider } from "@/contexts/ReceiptsContext";
import { RouteGuard } from "@/components/RouteGuard";
import { BottomNav } from "@/components/BottomNav";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReceiptsProvider>
          <RouteGuard>
            {children}
            <BottomNav />
          </RouteGuard>
        </ReceiptsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
