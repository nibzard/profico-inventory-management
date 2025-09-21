// ABOUTME: Enhanced approval dashboard for team leads and admins with request management
// ABOUTME: Provides comprehensive view of pending requests, analytics, and bulk actions

"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  User,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Package,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Eye,
  Edit,
  Download,
} from "lucide-react";
import Link from "next/link";
import type { EquipmentRequest, User, Equipment } from "@prisma/client";

interface RequestWithRelations extends EquipmentRequest {
  requester: User;
  approver: User | null;
  equipment: Equipment | null;
}

interface ApprovalDashboardProps {
  pendingRequests: RequestWithRelations[];
  myApprovals: RequestWithRelations[];
  stats: {
    totalPending: number;
    myPending: number;
    approvedToday: number;
    rejectedToday: number;
    avgApprovalTime: number;
  };
  userRole: string;
  userId: string;
}

export function ApprovalDashboard({
  pendingRequests,
  myApprovals,
  stats,
  userRole,
  userId,
}: ApprovalDashboardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithRelations | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  const filteredRequests = pendingRequests.filter((request) => {
    const matchesSearch = !searchTerm || 
      request.equipmentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.justification.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

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

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/requests/${selectedRequest.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes: approvalNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve request");
      }

      const result = await response.json();
      toast.success("Request approved successfully!");
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      setApprovalNotes("");
      router.refresh();
    } catch (error) {
      console.error("Approval error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to approve request"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/requests/${selectedRequest.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: rejectionReason.trim(),
          notes: approvalNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject request");
      }

      const result = await response.json();
      toast.success("Request rejected successfully!");
      setShowRejectionDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      setApprovalNotes("");
      router.refresh();
    } catch (error) {
      console.error("Rejection error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reject request"
      );
    } finally {
      setIsLoading(false);
    }
  };

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

    return (
      <Badge
        variant={variants[priority as keyof typeof variants] || "outline"}
        className="flex items-center space-x-1"
      >
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Request Approval Dashboard</h1>
          <p className="text-gray-600">
            Manage and approve equipment requests
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Total Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.totalPending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              My Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.myPending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <ThumbsUp className="h-4 w-4 mr-2" />
              Approved Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.approvedToday}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <ThumbsDown className="h-4 w-4 mr-2" />
              Rejected Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.rejectedToday}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Avg. Approval Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgApprovalTime}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending Requests ({filteredRequests.length})</TabsTrigger>
          <TabsTrigger value="my-approvals">My Approvals ({myApprovals.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setPriorityFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Requests */}
          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-gray-500 text-lg">No pending requests</p>
                  <p className="text-gray-400 mt-2">
                    All requests have been processed
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((request) => (
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

                          {canApprove(request) && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowApprovalDialog(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectionDialog(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Requester Info */}
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

                      {/* Budget Info */}
                      {request.budget && (
                        <div className="flex items-center space-x-2 text-sm">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Budget:</span>
                          <span>€{request.budget.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Needed By */}
                      {request.neededBy && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Needed by:</span>
                          <span>{new Date(request.neededBy).toLocaleDateString()}</span>
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
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowApprovalDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectionDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-approvals" className="space-y-4">
          <div className="space-y-4">
            {myApprovals.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg">No approvals yet</p>
                  <p className="text-gray-400 mt-2">
                    Your approval history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              myApprovals.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <CardTitle className="text-lg">
                            {request.equipmentType}
                          </CardTitle>
                          {getStatusBadge(request)}
                          {getPriorityBadge(request.priority)}
                        </div>
                        <CardDescription>
                          {request.requester.name} • {new Date(request.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/requests/${request.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {request.justification}
                      </p>
                      {request.approvalNotes && (
                        <div className="bg-gray-50 p-2 rounded text-sm">
                          <span className="font-medium">Notes:</span> {request.approvalNotes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Approval Trends</CardTitle>
                <CardDescription>
                  Request approval patterns over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Analytics dashboard coming soon</p>
                  <p className="text-sm mt-2">Detailed charts and insights will be available here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Your approval efficiency and response times
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Approval Rate</span>
                    <span className="text-sm font-bold text-green-600">85%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Avg Response Time</span>
                    <span className="text-sm font-bold">2.3 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Processed</span>
                    <span className="text-sm font-bold">{myApprovals.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this request?
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium">{selectedRequest.equipmentType}</h4>
                <p className="text-sm text-gray-600">
                  Requested by {selectedRequest.requester.name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedRequest.justification}
                </p>
              </div>
              <div>
                <Label htmlFor="approvalNotes">Approval Notes (Optional)</Label>
                <Textarea
                  id="approvalNotes"
                  placeholder="Add any notes about this approval..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isLoading}>
              {isLoading ? "Approving..." : "Approve Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium">{selectedRequest.equipmentType}</h4>
                <p className="text-sm text-gray-600">
                  Requested by {selectedRequest.requester.name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedRequest.justification}
                </p>
              </div>
              <div>
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Please explain why this request is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div>
                <Label htmlFor="rejectionNotes">Additional Notes (Optional)</Label>
                <Textarea
                  id="rejectionNotes"
                  placeholder="Any additional notes or suggestions..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isLoading}
            >
              {isLoading ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}