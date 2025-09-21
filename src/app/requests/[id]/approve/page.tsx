// ABOUTME: Equipment request approval page for team leads and admins
// ABOUTME: Handles the approval workflow with notes and decision confirmation

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface RequestData {
  id: string;
  equipmentType: string;
  justification: string;
  priority: string;
  budget?: number;
  neededBy?: string;
  specificRequirements?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
    team?: {
      name: string;
      leader?: {
        name: string;
        email: string;
      };
    };
  };
  teamLeadApproval: boolean | null;
  adminApproval: boolean | null;
  approvalNotes?: string;
  rejectionReason?: string;
}

interface ApprovalPageProps {
  params: Promise<{ id: string }>;
}

export default function ApprovalPage({ params }: ApprovalPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [request, setRequest] = useState<RequestData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const loadRequest = async () => {
      try {
        const session = await auth();
        if (!session) {
          router.push("/auth/signin");
          return;
        }

        const { id } = await params;
        
        // Fetch request data
        const response = await fetch(`/api/requests/${id}/status`);
        if (!response.ok) {
          if (response.status === 404) {
            router.push("/requests");
            return;
          }
          throw new Error("Failed to fetch request");
        }

        const requestData = await response.json();
        setRequest(requestData);
        setUser(session.user);

        // Check if user can approve this request
        const canApprove = 
          (session.user.role === "team_lead" && requestData.teamLeadApproval === null) ||
          (session.user.role === "admin" && 
           requestData.teamLeadApproval === true && 
           requestData.adminApproval === null);

        if (!canApprove) {
          toast.error("You don't have permission to approve this request");
          router.push(`/requests/${id}`);
          return;
        }
      } catch (error) {
        console.error("Error loading request:", error);
        toast.error("Failed to load request");
        router.push("/requests");
      }
    };

    loadRequest();
  }, [params, router]);

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

  const handleApprove = async () => {
    if (!request) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/requests/${request.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve request");
      }

      const result = await response.json();
      toast.success("Request approved successfully!");
      router.push(`/requests/${request.id}`);
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
    if (!request) return;

    const rejectionReason = prompt("Please provide a reason for rejection:");
    if (!rejectionReason?.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/requests/${request.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          rejectionReason: rejectionReason.trim(),
          notes 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject request");
      }

      const result = await response.json();
      toast.success("Request rejected successfully!");
      router.push(`/requests/${request.id}`);
    } catch (error) {
      console.error("Rejection error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reject request"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!request || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Loading request...</p>
        </div>
      </div>
    );
  }

  const isTeamLeadApproval = user.role === "team_lead";
  const isAdminApproval = user.role === "admin";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/requests/${request.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Request
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Review Equipment Request</h1>
            <p className="text-gray-600">
              {isTeamLeadApproval
                ? "Team Lead Review Required"
                : "Admin Approval Required"}
            </p>
          </div>
        </div>

        {/* Alert Banner */}
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Approval Required:</strong> This request requires your{" "}
            {isTeamLeadApproval ? "team lead" : "admin"} review. Please review
            the details carefully before making a decision.
          </AlertDescription>
        </Alert>

        {/* Request Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Request Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <span className="font-medium">Equipment:</span>
              <span>{request.equipmentType}</span>
              {getPriorityBadge(request.priority)}
            </div>

            {request.budget && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Budget:</span>
                <span>€{request.budget.toLocaleString()}</span>
              </div>
            )}

            {request.neededBy && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Needed By:</span>
                <span>{new Date(request.neededBy).toLocaleDateString()}</span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Submitted:</span>
              <span>{new Date(request.createdAt).toLocaleDateString()}</span>
            </div>

            <div>
              <p className="font-medium mb-2">Justification:</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">{request.justification}</p>
              </div>
            </div>

            {request.specificRequirements && (
              <div>
                <p className="font-medium mb-2">Specific Requirements:</p>
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
                <p className="text-sm text-gray-600">{request.requester.email}</p>
                {request.requester.team && (
                  <p className="text-sm text-gray-600">
                    Team: {request.requester.team.name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Decision */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Decision</CardTitle>
            <CardDescription>
              Please review the request and provide your decision. Adding notes
              is recommended for transparency.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes">Approval Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about your decision, conditions, or follow-up actions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-gray-600 mt-1">
                Notes will be shared with the requester and other approvers.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">
                Consider Before Approving:
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Is the equipment request justified and business-critical?</li>
                <li>• Does the requested equipment align with company policies?</li>
                <li>• Is the budget reasonable and within department limits?</li>
                <li>• Could existing equipment be reassigned instead?</li>
                <li>• Are there any security or compliance considerations?</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => router.push(`/requests/${request.id}`)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {isLoading ? "Rejecting..." : "Reject Request"}
              </Button>
              <Button onClick={handleApprove} disabled={isLoading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {isLoading ? "Approving..." : "Approve Request"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}