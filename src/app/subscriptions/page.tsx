// ABOUTME: Subscriptions listing page with search, filtering, and role-based actions
// ABOUTME: Main subscription management interface for viewing and managing all software subscriptions

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { SubscriptionList } from "@/components/subscriptions/subscription-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, CreditCard, Calendar, Users } from "lucide-react";
import Link from "next/link";

interface SearchParams {
  search?: string;
  vendor?: string;
  billingFrequency?: string;
  paymentMethod?: string;
  isActive?: string;
  isReimbursement?: string;
  renewalDateFrom?: string;
  renewalDateTo?: string;
  page?: string;
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { user } = session;
  const currentPage = parseInt(searchParams.page || "1");
  const pageSize = 12;

  // Build filters
  const filters: Record<string, unknown> = {};

  if (searchParams.search) {
    filters.OR = [
      { softwareName: { contains: searchParams.search, mode: "insensitive" } },
      { vendor: { contains: searchParams.search, mode: "insensitive" } },
      { licenseKey: { contains: searchParams.search, mode: "insensitive" } },
    ];
  }

  if (searchParams.vendor) {
    filters.vendor = { contains: searchParams.vendor, mode: "insensitive" };
  }

  if (searchParams.billingFrequency) {
    filters.billingFrequency = searchParams.billingFrequency;
  }

  if (searchParams.paymentMethod) {
    filters.paymentMethod = searchParams.paymentMethod;
  }

  if (searchParams.isActive) {
    filters.isActive = searchParams.isActive === "true";
  }

  if (searchParams.isReimbursement) {
    filters.isReimbursement = searchParams.isReimbursement === "true";
  }

  if (searchParams.renewalDateFrom || searchParams.renewalDateTo) {
    filters.renewalDate = {};
    if (searchParams.renewalDateFrom) {
      filters.renewalDate.gte = new Date(searchParams.renewalDateFrom);
    }
    if (searchParams.renewalDateTo) {
      filters.renewalDate.lte = new Date(searchParams.renewalDateTo);
    }
  }

  // For regular users, only show their own subscriptions
  if (user.role === "user") {
    filters.assignedUserId = user.id;
  }

  // Fetch subscriptions with pagination
  const [subscriptions, totalCount] = await Promise.all([
    db.subscription.findMany({
      where: filters,
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { renewalDate: "asc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    db.subscription.count({ where: filters }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Calculate subscription statistics
  const stats = await db.subscription.groupBy({
    by: ["isActive", "billingFrequency"],
    _count: { id: true },
    _sum: { price: true },
    where: user.role === "user" ? { assignedUserId: user.id } : {},
  });

  const totalSubscriptions = stats.reduce((acc, stat) => acc + stat._count.id, 0);
  const activeSubscriptions = stats
    .filter(stat => stat.isActive)
    .reduce((acc, stat) => acc + stat._count.id, 0);
  const monthlyRevenue = stats
    .filter(stat => stat.isActive && stat.billingFrequency === "monthly")
    .reduce((acc, stat) => acc + (stat._sum.price || 0), 0);
  const yearlyRevenue = stats
    .filter(stat => stat.isActive && stat.billingFrequency === "yearly")
    .reduce((acc, stat) => acc + (stat._sum.price || 0), 0);

  // Get unique values for filters
  const [vendors, billingFrequencies, paymentMethods] = await Promise.all([
    db.subscription.findMany({
      select: { vendor: true },
      distinct: ["vendor"],
      where: { vendor: { not: null } },
    }),
    db.subscription.findMany({
      select: { billingFrequency: true },
      distinct: ["billingFrequency"],
    }),
    db.subscription.findMany({
      select: { paymentMethod: true },
      distinct: ["paymentMethod"],
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Software Subscriptions</h1>
          <p className="text-gray-600 mt-2">
            Manage software licenses and subscriptions
          </p>
        </div>
        {(user.role === "admin" || user.role === "team_lead") && (
          <Button asChild>
            <Link href="/subscriptions/add">
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Link>
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Subscriptions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {activeSubscriptions} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{monthlyRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Yearly Revenue
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{yearlyRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Monthly Cost
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{activeSubscriptions > 0 ? (monthlyRevenue / activeSubscriptions).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Per active subscription
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter subscriptions by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <input
                  type="text"
                  placeholder="Search subscriptions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={searchParams.search || ""}
                  name="search"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Vendor</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={searchParams.vendor || ""}
                  name="vendor"
                >
                  <option value="">All Vendors</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.vendor || "unknown"} value={vendor.vendor || ""}>
                      {vendor.vendor || "Unknown"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Billing Frequency</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={searchParams.billingFrequency || ""}
                  name="billingFrequency"
                >
                  <option value="">All Frequencies</option>
                  {billingFrequencies.map((freq) => (
                    <option key={freq.billingFrequency} value={freq.billingFrequency}>
                      {freq.billingFrequency.charAt(0).toUpperCase() + freq.billingFrequency.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={searchParams.paymentMethod || ""}
                  name="paymentMethod"
                >
                  <option value="">All Methods</option>
                  {paymentMethods.map((method) => (
                    <option key={method.paymentMethod} value={method.paymentMethod}>
                      {method.paymentMethod === "company_card" ? "Company Card" : "Personal Card"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={searchParams.isActive || ""}
                  name="isActive"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reimbursement</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={searchParams.isReimbursement || ""}
                  name="isReimbursement"
                >
                  <option value="">All Types</option>
                  <option value="true">Requires Reimbursement</option>
                  <option value="false">No Reimbursement</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Renewal From</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={searchParams.renewalDateFrom || ""}
                  name="renewalDateFrom"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Renewal To</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={searchParams.renewalDateTo || ""}
                  name="renewalDateTo"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.search = '';
                  window.location.href = url.toString();
                }}
              >
                Clear Filters
              </Button>
              <Button type="submit">
                Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Subscription List */}
      <SubscriptionList
        subscriptions={subscriptions}
        currentPage={currentPage}
        totalPages={totalPages}
        userRole={user.role}
        userId={user.id}
      />
    </div>
  );
}