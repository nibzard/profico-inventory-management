// ABOUTME: Team management page for administrators
// ABOUTME: Provides interface for managing teams, team leads, and team assignments

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeamManagementDashboard } from "@/components/teams/team-management-dashboard";

export default async function AdminTeamsPage() {
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
      <TeamManagementDashboard />
    </div>
  );
}