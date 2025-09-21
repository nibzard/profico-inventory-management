// ABOUTME: Approval queue page for team leads and admins to review pending requests
// ABOUTME: Shows requests needing approval based on user role with filtering and actions

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
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
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, Filter } from "lucide-react";
import Link from "next/link";

interface SearchParams {
  status?: string;
  page?: string;
}

export default async function ApprovalQueuePage({
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

  // Check if user has approval permissions
  if (user.role === "user") {
    redirect("/requests");
  }

  // Build approval queue filters based on user role
  let whereClause: Record<string, unknown> = {};
  let approvalType = "";

  if (user.role === "team_lead") {
    // Team leads see requests needing their approval
    whereClause = {
      status: "pending",
      teamLeadApproval: null,
    };
    approvalType = "Team Lead";
  } else if (user.role === "admin") {
    // Admins see requests that have team lead approval but need admin approval
    whereClause = {
      status: "pending",
      teamLeadApproval: true,
      adminApproval: null,
    };
    approvalType = "Admin";
  }

  if (searchParams.status) {
    whereClause.status = searchParams.status;
  }

  // Fetch requests needing approval
  const [requests, totalCount, urgentCount, highPriorityCount] = await Promise.all([
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
      orderBy: [
        { priority: "desc" }, // Higher priority first
        { createdAt: "asc" },  // Older requests first within same priority
      ],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    db.equipmentRequest.count({ where: whereClause }),
    db.equipmentRequest.count({
      where: { ...whereClause, priority: "urgent" },
    }),
    db.equipmentRequest.count({
      where: { ...whereClause, priority: "high" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/requests">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Requests
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Approval Queue</h1>
              <p className="text-gray-600">
                {approvalType} Approval - {totalCount} request{totalCount !== 1 ? "s" : ""} waiting for your review
              </p>
            </div>
          </div>
          {(urgentCount > 0 || highPriorityCount > 0) && (
            <div className="flex items-center space-x-2">
              {urgentCount > 0 && (
                <Badge variant="destructive" className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{urgentCount} Urgent</span>
                </Badge>
              )}
              {highPriorityCount > 0 && (
                <Badge variant="default" className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{highPriorityCount} High Priority</span>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Total in Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {totalCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Urgent Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {urgentCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                High Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {highPriorityCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Your Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold capitalize">
                {user.role.replace("_", " ")}
              </div>
              <div className="text-sm text-gray-600">
                {approvalType} Approver
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Guidelines */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Approval Guidelines
            </CardTitle>
            <CardDescription className="text-blue-700">
              As a {approvalType.toLowerCase()} approver, please follow these guidelines when reviewing requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">When to Approve</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Equipment is essential for job functions</li>
                  <li>• Request includes proper business justification</li>
                  <li>• Budget is reasonable and within limits</li>
                  <li>• Aligns with company equipment policies</li>
                  <li>• No suitable alternative equipment available</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">When to Reject</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Insufficient or unclear justification</li>
                  <li>• Budget exceeds department limits</li>
                  <li>• Non-essential or luxury items</li>
                  <li>• Similar equipment already available</li>
                  <li>• Violates company policies</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Remember:</strong> Always provide clear notes for your decisions to maintain transparency and help requesters understand the approval process.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Priority Filter */}
        <div className="flex space-x-2">
          <Button
            asChild
            variant={!searchParams.status ? "default" : "outline"}
            size="sm"
          >
            <Link href="/requests/approve">All Priorities</Link>
          </Button>
          <Button
            asChild
            variant={searchParams.status === "urgent" ? "default" : "outline"}
            size="sm"
          >
            <Link href="/requests/approve?status=urgent">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Urgent Only
            </Link>
          </Button>
          <Button
            asChild
            variant={searchParams.status === "high" ? "default" : "outline"}
            size="sm"
          >
            <Link href="/requests/approve?status=high">
              <AlertTriangle className="h-4 w-4 mr-1" />
              High Priority Only
            </Link>
          </Button>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Requests Needing Approval
              </h3>
              <p className="text-gray-600 mb-4">
                Great! All requests have been reviewed. Check back later for new requests requiring your attention.
              </p>
              <Button asChild>
                <Link href="/requests">View All Requests</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <RequestsList
            requests={requests}
            currentPage={currentPage}
            totalPages={totalPages}
            userRole={user.role}
            userId={user.id}
          />
        )}
      </div>
    </div>
  );
}