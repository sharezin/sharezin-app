'use client';

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ReceiptsProvider } from "@/contexts/ReceiptsContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { UserPlanProvider } from "@/contexts/UserPlanContext";
import { RouteGuard } from "@/components/RouteGuard";
import { BottomNav } from "@/components/BottomNav";
import { NotificationAlert } from "@/components/NotificationAlert";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReceiptsProvider>
          <NotificationsProvider>
            <UserPlanProvider>
              <RouteGuard>
                {children}
                <BottomNav />
                <NotificationAlert />
              </RouteGuard>
            </UserPlanProvider>
          </NotificationsProvider>
        </ReceiptsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
