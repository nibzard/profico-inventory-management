// ABOUTME: Enhanced subscription listing page with comprehensive data table, advanced filtering, and role-based actions
// ABOUTME: Modern subscription management interface with sorting, search, export capabilities, and responsive design

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { SubscriptionTable } from "@/components/subscriptions/subscription-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Plus, 
  CreditCard, 
  Calendar, 
  Users, 
  Download,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import Link from "next/link";
import { SubscriptionStatus, BillingCycle } from "@/types/subscription";

interface SearchParams {
  search?: string;
  vendor?: string;
  billingCycle?: BillingCycle;
  status?: SubscriptionStatus;
  assignedTo?: string;
  costMin?: string;
  costMax?: string;
  renewalDateFrom?: string;
  renewalDateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: string;
  pageSize?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function SubscriptionsPage({
  searchParams,
}: PageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { user } = session;
  const params = await searchParams;
  const currentPage = parseInt(params.page || "1");
  const pageSize = parseInt(params.pageSize || "20");

  // Build filters
  const filters: Record<string, unknown> = {};

  if (params.search) {
    filters.OR = [
      { softwareName: { contains: params.search, mode: "insensitive" } },
      { vendor: { contains: params.search, mode: "insensitive" } },
      { licenseKey: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params.vendor) {
    filters.vendor = { contains: params.vendor, mode: "insensitive" };
  }

  if (params.billingCycle) {
    filters.billingFrequency = params.billingCycle;
  }

  if (params.status) {
    if (params.status === "ACTIVE") {
      filters.isActive = true;
    } else if (params.status === "INACTIVE") {
      filters.isActive = false;
    }
  }

  if (params.assignedTo) {
    filters.assignedUserId = params.assignedTo;
  }

  if (params.costMin || params.costMax) {
    filters.price = {};
    if (params.costMin) {
      filters.price.gte = parseFloat(params.costMin);
    }
    if (params.costMax) {
      filters.price.lte = parseFloat(params.costMax);
    }
  }

  if (params.renewalDateFrom || params.renewalDateTo) {
    filters.renewalDate = {};
    if (params.renewalDateFrom) {
      filters.renewalDate.gte = new Date(params.renewalDateFrom);
    }
    if (params.renewalDateTo) {
      filters.renewalDate.lte = new Date(params.renewalDateTo);
    }
  }

  // For regular users, only show their own subscriptions
  if (user.role === "user") {
    filters.assignedUserId = user.id;
  }

  // Build sorting
  const orderBy: Record<string, string> = {};
  if (params.sortBy) {
    orderBy[params.sortBy] = params.sortOrder || "asc";
  } else {
    orderBy.renewalDate = "asc";
  }

  // Fetch subscriptions with pagination
  const [subscriptions, totalCount] = await Promise.all([
    db.subscription.findMany({
      where: filters,
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        subscriptionInvoices: {
          select: { id: true, status: true, dueDate: true, amount: true },
          orderBy: { dueDate: "desc" },
          take: 1,
        },
      },
      orderBy,
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
  const [vendors, billingCycles, users] = await Promise.all([
    db.subscription.findMany({
      select: { vendor: true },
      distinct: ["vendor"],
      where: { vendor: { not: null } },
    }),
    db.subscription.findMany({
      select: { billingFrequency: true },
      distinct: ["billingFrequency"],
    }),
    db.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Calculate subscription status distribution
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const statusCounts = await db.subscription.groupBy({
    by: ["isActive"],
    _count: { id: true },
    where: user.role === "user" ? { assignedUserId: user.id } : {},
  });

  const expiringSoonCount = await db.subscription.count({
    where: {
      ...(user.role === "user" ? { assignedUserId: user.id } : {}),
      renewalDate: { lte: thirtyDaysFromNow, gte: now },
      isActive: true,
    },
  });

  const expiredCount = await db.subscription.count({
    where: {
      ...(user.role === "user" ? { assignedUserId: user.id } : {}),
      renewalDate: { lt: now },
      isActive: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Software Subscriptions</h1>
          <p className="text-gray-600 mt-2">
            Manage software licenses, subscriptions, and billing
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(user.role === "admin" || user.role === "team_lead") && (
            <Button asChild>
              <Link href="/subscriptions/add">
                <Plus className="h-4 w-4 mr-2" />
                Add Subscription
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/subscriptions/billing">
              <CreditCard className="h-4 w-4 mr-2" />
              Billing Management
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/api/subscriptions/export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              {activeSubscriptions} active subscriptions
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
              Recurring monthly revenue
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
              Annual subscription value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Renewal Status
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expiredCount > 0 ? (
                <span className="text-red-600">{expiredCount}</span>
              ) : expiringSoonCount > 0 ? (
                <span className="text-yellow-600">{expiringSoonCount}</span>
              ) : (
                <span className="text-green-600">0</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {expiredCount > 0 ? "Expired subscriptions" : 
               expiringSoonCount > 0 ? "Expiring soon" : "All up to date"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Table */}
      <SubscriptionTable
        subscriptions={subscriptions}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        userRole={user.role}
        userId={user.id}
        searchParams={params}
        availableFilters={{
          vendors: vendors.map(v => v.vendor).filter(Boolean) as string[],
          billingCycles: billingCycles.map(b => b.billingFrequency) as BillingCycle[],
          users: users,
        }}
      />
    </div>
  );
}