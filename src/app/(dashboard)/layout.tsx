// ABOUTME: Dashboard layout for authenticated pages in ProfiCo Inventory Management System
// ABOUTME: Provides consistent layout structure for all dashboard pages with authentication checks

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayoutProvider } from "./dashboard-layout-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { user } = session;

  return (
    <DashboardLayoutProvider user={user}>
      {children}
    </DashboardLayoutProvider>
  );
}