// ABOUTME: Client-side dashboard layout provider for ProfiCo Inventory Management System
// ABOUTME: Provides user context and dashboard layout with session management

"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SessionProvider } from "next-auth/react";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "admin" | "team_lead" | "user";
}

interface DashboardLayoutProviderProps {
  children: React.ReactNode;
  user: User;
}

export function DashboardLayoutProvider({ children, user }: DashboardLayoutProviderProps) {
  return (
    <SessionProvider>
      <DashboardLayout userRole={user.role}>
        {children}
      </DashboardLayout>
    </SessionProvider>
  );
}