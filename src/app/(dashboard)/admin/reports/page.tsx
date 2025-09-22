// ABOUTME: Admin reports page for comprehensive inventory analytics and insights
// ABOUTME: Provides detailed reporting dashboard with equipment utilization, user activity, and compliance reports

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminReportsDashboard } from "@/components/reports/admin-reports-dashboard";

export default async function AdminReportsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user has admin permissions
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminReportsDashboard />
    </div>
  );
}