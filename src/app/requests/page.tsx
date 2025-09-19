// ABOUTME: Equipment requests listing page with role-based views
// ABOUTME: Shows user's requests or approval queue based on user role

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { RequestsList } from "@/components/requests/requests-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface SearchParams {
  status?: string;
  page?: string;
}

export default async function RequestsPage({
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
  const pageSize = 10;

  // Build filters based on user role
  let whereClause: Record<string, unknown> = {};

  if (user.role === "user") {
    // Regular users only see their own requests
    whereClause.requesterId = user.id;
  } else {
    // Team leads and admins can see all requests (filtered later)
    whereClause = {};
  }

  if (searchParams.status) {
    whereClause.status = searchParams.status;
  }

  // Fetch requests with pagination
  const [requests, totalCount, pendingCount, approvedCount, rejectedCount] =
    await Promise.all([
      db.equipmentRequest.findMany({
        where: whereClause,
        include: {
          requester: {
            select: { id: true, name: true, email: true, role: true },
          },
          approver: {
            select: { id: true, name: true, email: true, role: true },
          },
          equipment: {
            select: { id: true, name: true, serialNumber: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
      db.equipmentRequest.count({ where: whereClause }),
      db.equipmentRequest.count({
        where: { ...whereClause, status: "pending" },
      }),
      db.equipmentRequest.count({
        where: { ...whereClause, status: "approved" },
      }),
      db.equipmentRequest.count({
        where: { ...whereClause, status: "rejected" },
      }),
    ]);

  // Count requests needing approval for team leads/admins
  let needsApprovalCount = 0;
  if (user.role === "team_lead") {
    needsApprovalCount = await db.equipmentRequest.count({
      where: {
        status: "pending",
        teamLeadApproval: null,
      },
    });
  } else if (user.role === "admin") {
    needsApprovalCount = await db.equipmentRequest.count({
      where: {
        status: "pending",
        teamLeadApproval: true,
        adminApproval: null,
      },
    });
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Equipment Requests</h1>
            <p className="text-gray-600">
              {user.role === "user"
                ? "View and manage your equipment requests"
                : "Review and approve equipment requests"}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button asChild>
              <Link href="/requests/new">
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Link>
            </Button>
            {(user.role === "admin" || user.role === "team_lead") &&
              needsApprovalCount > 0 && (
                <Button asChild variant="secondary">
                  <Link href="/requests/approve">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Approve Requests ({needsApprovalCount})
                  </Link>
                </Button>
              )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {pendingCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {approvedCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <XCircle className="h-4 w-4 mr-2" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {rejectedCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Needs Approval Alert */}
        {needsApprovalCount > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Requests Awaiting Your Approval
              </CardTitle>
              <CardDescription className="text-orange-700">
                You have {needsApprovalCount} request
                {needsApprovalCount !== 1 ? "s" : ""} waiting for your approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/requests/approve">Review Pending Requests</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status Filters */}
        <div className="flex space-x-2">
          <Button
            asChild
            variant={!searchParams.status ? "default" : "outline"}
            size="sm"
          >
            <Link href="/requests">All</Link>
          </Button>
          <Button
            asChild
            variant={searchParams.status === "pending" ? "default" : "outline"}
            size="sm"
          >
            <Link href="/requests?status=pending">Pending</Link>
          </Button>
          <Button
            asChild
            variant={searchParams.status === "approved" ? "default" : "outline"}
            size="sm"
          >
            <Link href="/requests?status=approved">Approved</Link>
          </Button>
          <Button
            asChild
            variant={searchParams.status === "rejected" ? "default" : "outline"}
            size="sm"
          >
            <Link href="/requests?status=rejected">Rejected</Link>
          </Button>
        </div>

        {/* Requests List */}
        <RequestsList
          requests={requests}
          currentPage={currentPage}
          totalPages={totalPages}
          userRole={user.role}
          userId={user.id}
        />
      </div>
    </div>
  );
}
