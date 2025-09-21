// ABOUTME: Equipment request detail page showing full request information and actions
// ABOUTME: Displays request details with approval workflow and status tracking

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  FileText,
  Edit,
  Package,
  Mail,
  Phone,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RequestDetailPage({ params }: PageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect("/auth/signin");
  }

  const { user } = session;

  // Fetch the request with all related data
  const request = await db.equipmentRequest.findUnique({
    where: { id },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          team: {
            select: {
              name: true,
              leader: {
                select: { name: true, email: true }
              }
            }
          }
        },
      },
      approver: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      equipment: {
        select: {
          id: true,
          name: true,
          serialNumber: true,
          status: true,
          assignedTo: {
            select: { name: true, email: true }
          }
        },
      },
    },
  });

  if (!request) {
    notFound();
  }

  // Check if user can view this request
  if (user.role === "user" && request.requesterId !== user.id) {
    redirect("/requests");
  }

  const canApprove = () => {
    if (request.status !== "pending") return false;

    if (user.role === "team_lead" && request.teamLeadApproval === null) {
      return true;
    }

    if (
      user.role === "admin" &&
      request.teamLeadApproval === true &&
      request.adminApproval === null
    ) {
      return true;
    }

    return false;
  };

  const canEdit = () => {
    return request.requesterId === user.id && request.status === "pending";
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "secondary", icon: Clock, text: "Pending" },
      approved: { color: "default", icon: CheckCircle, text: "Approved" },
      rejected: { color: "destructive", icon: XCircle, text: "Rejected" },
      ordered: { color: "secondary", icon: Package, text: "Ordered" },
      fulfilled: { color: "default", icon: CheckCircle, text: "Fulfilled" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "outline",
      icon: Clock,
      text: status,
    };

    const Icon = config.icon;
    return (
      <Badge variant={config.color as any} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{config.text}</span>
      </Badge>
    );
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

  const getApprovalStep = (
    label: string,
    approved: boolean | null,
    required: boolean,
    approver?: { name: string; email: string } | null
  ) => {
    let statusColor = "bg-gray-100 text-gray-500";
    let statusText = "Pending";

    if (approved === true) {
      statusColor = "bg-green-100 text-green-700";
      statusText = "Approved";
    } else if (approved === false) {
      statusColor = "bg-red-100 text-red-700";
      statusText = "Rejected";
    } else if (!required) {
      statusColor = "bg-gray-100 text-gray-500";
      statusText = "Not Required";
    }

    return (
      <div className="flex items-center space-x-3">
        <div className={`px-3 py-2 rounded-lg text-sm font-medium ${statusColor}`}>
          {statusText}
        </div>
        <div>
          <p className="font-medium">{label}</p>
          {approver && approved === true && (
            <p className="text-sm text-gray-600">by {approver.name}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Equipment Request Details</h1>
            <p className="text-gray-600 mt-2">
              Request #{id.slice(-8)} submitted on{" "}
              {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2">
            {getStatusBadge(request.status)}
            {getPriorityBadge(request.priority)}
          </div>
        </div>

        {/* Request Information */}
        <Card>
          <CardHeader>
            <CardTitle>Request Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Equipment Type</p>
                <p className="font-medium">{request.equipmentType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Category</p>
                <p className="font-medium capitalize">{request.category}</p>
              </div>
              {request.budget && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Budget</p>
                  <p className="font-medium">€{request.budget.toLocaleString()}</p>
                </div>
              )}
              {request.neededBy && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Needed By</p>
                  <p className="font-medium">
                    {new Date(request.neededBy).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Justification</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">{request.justification}</p>
              </div>
            </div>

            {request.specificRequirements && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Specific Requirements
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{request.specificRequirements}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Requester Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Requester Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={request.requester.image || ""} />
                <AvatarFallback>
                  {request.requester.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="font-medium">{request.requester.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {request.requester.role.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>{request.requester.email}</span>
                  </div>
                  {request.requester.team && (
                    <span>Team: {request.requester.team.name}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Workflow */}
        {request.status === "pending" || request.status === "approved" || request.status === "rejected" ? (
          <Card>
            <CardHeader>
              <CardTitle>Approval Workflow</CardTitle>
              <CardDescription>
                Track the progress of your request through the approval process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getApprovalStep(
                  "Team Lead Review",
                  request.teamLeadApproval,
                  true,
                  request.teamLeadApproval === true ? request.approver : undefined
                )}
                
                {request.teamLeadApproval === true && (
                  <div className="ml-4 border-l-2 border-gray-300 pl-4">
                    {getApprovalStep(
                      "Admin Approval",
                      request.adminApproval,
                      true,
                      request.adminApproval === true ? request.approver : undefined
                    )}
                  </div>
                )}

                {request.approvalNotes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Approval Notes:</p>
                    <p className="text-sm text-gray-600 mt-1">{request.approvalNotes}</p>
                  </div>
                )}

                {request.rejectionReason && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-700">Rejection Reason:</p>
                    <p className="text-sm text-red-600 mt-1">{request.rejectionReason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Equipment Assignment */}
        {request.equipment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Assigned Equipment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <h3 className="font-medium">{request.equipment.name}</h3>
                  <p className="text-sm text-gray-600">
                    Serial: {request.equipment.serialNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    Status: {request.equipment.status.replace("_", " ").toUpperCase()}
                  </p>
                </div>
                {request.equipment.assignedTo && (
                  <div className="text-right">
                    <p className="text-sm font-medium">Assigned to:</p>
                    <p className="text-sm text-gray-600">
                      {request.equipment.assignedTo.name}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {canEdit() && (
                <Button asChild variant="outline">
                  <Link href={`/requests/${request.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Request
                  </Link>
                </Button>
              )}

              {canApprove() && (
                <>
                  <Button asChild>
                    <Link href={`/requests/${request.id}/approve`}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Request
                    </Link>
                  </Button>
                  <Button asChild variant="destructive">
                    <Link href={`/requests/${request.id}/reject`}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Request
                    </Link>
                  </Button>
                </>
              )}

              <Button asChild variant="outline">
                <Link href="/requests">Back to Requests</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}