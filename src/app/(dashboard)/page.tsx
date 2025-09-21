// ABOUTME: Default dashboard route that redirects to the main dashboard
// ABOUTME: Ensures users accessing /dashboard are redirected to the main dashboard page

import { redirect } from "next/navigation";

export default function DashboardRoot() {
  redirect("/dashboard");
}