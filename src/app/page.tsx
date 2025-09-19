import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  // Redirect authenticated users to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            ProfiCo Inventory Management
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Comprehensive inventory management solution for tracking hardware
            equipment and software subscriptions with role-based access and
            approval workflows.
          </p>
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/signup">Create Account</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Equipment Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track and manage all company equipment with complete lifecycle
                management, from laptops and mobile devices to office furniture
                and peripherals.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Request Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Streamlined multi-level approval process for equipment requests,
                transfers, and assignments with automated notifications.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Subscription Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage software subscriptions, track billing cycles, process
                invoices, and handle reimbursements for accounting purposes.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Role-Based Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Three-tier role system with Users, Team Leads, and Admins, each
                with appropriate permissions and dashboard views.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">QR Code Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate and scan QR codes for quick equipment identification,
                transfers, and inventory management with mobile support.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Compliance & Reporting</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate comprehensive reports for depreciation tracking,
                inventory verification, and accounting compliance.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
