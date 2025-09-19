// ABOUTME: Equipment requests list component displaying request cards with pagination
// ABOUTME: Shows request items with actions based on user role and request status

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import type { EquipmentRequest, User, Equipment } from "@prisma/client";

interface RequestWithRelations extends EquipmentRequest {
  requester: User;
  approver: User | null;
  equipment: Equipment | null;
}

interface RequestsListProps {
  requests: RequestWithRelations[];
  currentPage: number;
  totalPages: number;
  userRole: string;
  userId: string;
}

export function RequestsList({
  requests,
  currentPage,
  totalPages,
  userRole,
  userId,
}: RequestsListProps) {
  const getStatusBadge = (request: RequestWithRelations) => {
    const status = request.status;

    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="default"
            className="flex items-center space-x-1 bg-green-600"
          >
            <CheckCircle className="h-3 w-3" />
            <span>Approved</span>
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <XCircle className="h-3 w-3" />
            <span>Rejected</span>
          </Badge>
        );
      case "ordered":
        return (
          <Badge
            variant="secondary"
            className="flex items-center space-x-1 bg-blue-600 text-white"
          >
            <Clock className="h-3 w-3" />
            <span>Ordered</span>
          </Badge>
        );
      case "fulfilled":
        return (
          <Badge
            variant="default"
            className="flex items-center space-x-1 bg-green-700"
          >
            <CheckCircle className="h-3 w-3" />
            <span>Fulfilled</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: "outline",
      medium: "secondary",
      high: "default",
      urgent: "destructive",
    } as const;

    const icons = {
      low: null,
      medium: null,
      high: <AlertTriangle className="h-3 w-3" />,
      urgent: <AlertTriangle className="h-3 w-3" />,
    };

    return (
      <Badge
        variant={variants[priority as keyof typeof variants] || "outline"}
        className="flex items-center space-x-1"
      >
        {icons[priority as keyof typeof icons]}
        <span>{priority.toUpperCase()}</span>
      </Badge>
    );
  };

  const getApprovalStatus = (request: RequestWithRelations) => {
    if (request.status !== "pending") return null;

    const steps = [
      {
        label: "Team Lead",
        approved: request.teamLeadApproval,
        required: true,
      },
      {
        label: "Admin",
        approved: request.adminApproval,
        required: request.teamLeadApproval === true,
      },
    ];

    return (
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-gray-600">Approval:</span>
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center space-x-1">
            {index > 0 && <span className="text-gray-400">→</span>}
            <span
              className={`px-2 py-1 rounded ${
                step.approved === true
                  ? "bg-green-100 text-green-700"
                  : step.approved === false
                    ? "bg-red-100 text-red-700"
                    : step.required
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-500"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const canApprove = (request: RequestWithRelations) => {
    if (request.status !== "pending") return false;

    if (userRole === "team_lead" && request.teamLeadApproval === null) {
      return true;
    }

    if (
      userRole === "admin" &&
      request.teamLeadApproval === true &&
      request.adminApproval === null
    ) {
      return true;
    }

    return false;
  };

  const canEdit = (request: RequestWithRelations) => {
    return request.requesterId === userId && request.status === "pending";
  };

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-500 text-lg">No requests found</p>
          <p className="text-gray-400 mt-2">
            {userRole === "user"
              ? "You haven't submitted any equipment requests yet"
              : "No requests match the current filters"}
          </p>
          {userRole === "user" && (
            <Button asChild className="mt-4">
              <Link href="/requests/new">Submit Your First Request</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Requests Grid */}
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CardTitle className="text-lg">
                      {request.equipmentType}
                    </CardTitle>
                    {getStatusBadge(request)}
                    {getPriorityBadge(request.priority)}
                  </div>
                  <CardDescription className="flex items-center space-x-4">
                    <span>Requested by {request.requester.name}</span>
                    <span>•</span>
                    <span>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/requests/${request.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>

                    {canEdit(request) && (
                      <DropdownMenuItem asChild>
                        <Link href={`/requests/${request.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Request
                        </Link>
                      </DropdownMenuItem>
                    )}

                    {canApprove(request) && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href={`/requests/${request.id}/approve`}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/requests/${request.id}/reject`}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Requester Info (for admins/team leads) */}
                {userRole !== "user" && (
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={request.requester.image || ""} />
                      <AvatarFallback className="text-xs">
                        {request.requester.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.requester.name}</p>
                      <p className="text-sm text-gray-600">
                        {request.requester.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {request.requester.role.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                )}

                {/* Justification Preview */}
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Justification:
                  </p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {request.justification}
                  </p>
                </div>

                {/* Approval Status */}
                {getApprovalStatus(request)}

                {/* Rejection Reason */}
                {request.status === "rejected" && request.rejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800">
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {request.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Equipment Assignment */}
                {request.equipment && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      Assigned Equipment:
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      {request.equipment.name} ({request.equipment.serialNumber}
                      )
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-2 border-t flex space-x-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/requests/${request.id}`}>
                      View Full Details
                    </Link>
                  </Button>
                  {canApprove(request) && (
                    <Button asChild size="sm">
                      <Link href={`/requests/${request.id}/approve`}>
                        Review & Approve
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            asChild
          >
            <Link href={`/requests?page=${currentPage - 1}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 2
              )
              .map((page, index, array) => (
                <div key={page} className="flex items-center">
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="text-gray-400 px-2">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    asChild
                  >
                    <Link href={`/requests?page=${page}`}>{page}</Link>
                  </Button>
                </div>
              ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            asChild
          >
            <Link href={`/requests?page=${currentPage + 1}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
