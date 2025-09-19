// ABOUTME: Main dashboard page for ProfiCo Inventory Management System
// ABOUTME: Role-based dashboard showing personalized equipment and request information

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">ProfiCo Inventory</h1>
            <p className="text-gray-600">Equipment Management System</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <Link href="/profile" className="hover:underline">
                <p className="font-medium">{user.name}</p>
              </Link>
              <Badge
                variant={
                  user.role === "admin"
                    ? "default"
                    : user.role === "team_lead"
                      ? "secondary"
                      : "outline"
                }
              >
                {user.role.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Welcome back, {user.name}!</CardTitle>
              <CardDescription>
                You are logged in as a{" "}
                <strong>{user.role.replace("_", " ")}</strong>. Here&apos;s your
                personalized dashboard for the ProfiCo Inventory Management
                System.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment</CardTitle>
              <CardDescription>View and manage equipment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button asChild className="w-full" variant="outline">
                  <Link href="/equipment">View All Equipment</Link>
                </Button>
                {(user.role === "admin" || user.role === "team_lead") && (
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/equipment/add">Add Equipment</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Requests</CardTitle>
              <CardDescription>
                Equipment requests and approvals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button asChild className="w-full" variant="outline">
                  <Link href="/requests">My Requests</Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/requests/new">New Request</Link>
                </Button>
                {(user.role === "admin" || user.role === "team_lead") && (
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/requests/approve">Approve Requests</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Admin Features */}
          {user.role === "admin" && (
            <Card>
              <CardHeader>
                <CardTitle>Administration</CardTitle>
                <CardDescription>
                  System administration features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/admin/users">Manage Users</Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/admin/reports">Reports</Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/admin/settings">Settings</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity Placeholder */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest equipment and request updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <p>
                  Recent activity will be displayed here once equipment and
                  request features are implemented.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
