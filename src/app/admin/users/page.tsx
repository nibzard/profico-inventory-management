// ABOUTME: Admin user management page for user CRUD operations
// ABOUTME: Provides comprehensive user management interface for system administrators

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserManagementDashboard } from "@/components/users/user-management-dashboard";

export default async function AdminUsersPage() {
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
      <UserManagementDashboard />
    </div>
  );
}