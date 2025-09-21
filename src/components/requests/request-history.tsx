// ABOUTME: Request history timeline component for showing audit trail of request actions
// ABOUTME: Displays chronological history of all actions taken on a request

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import type { RequestHistoryEntry } from "@/lib/request-history";

interface RequestHistoryProps {
  requestId: string;
}

const actionIcons = {
  created: FileText,
  team_lead_approved: CheckCircle,
  team_lead_rejected: XCircle,
  admin_approved: CheckCircle,
  admin_rejected: XCircle,
  status_changed: Clock,
  equipment_assigned: Package,
};

const actionColors = {
  created: "bg-blue-500",
  team_lead_approved: "bg-green-500",
  team_lead_rejected: "bg-red-500",
  admin_approved: "bg-green-600",
  admin_rejected: "bg-red-600",
  status_changed: "bg-orange-500",
  equipment_assigned: "bg-purple-500",
};

const actionLabels = {
  created: "Request Created",
  team_lead_approved: "Team Lead Approved",
  team_lead_rejected: "Team Lead Rejected",
  admin_approved: "Admin Approved",
  admin_rejected: "Admin Rejected",
  status_changed: "Status Changed",
  equipment_assigned: "Equipment Assigned",
};

export function RequestHistory({ requestId }: RequestHistoryProps) {
  const [history, setHistory] = useState<RequestHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<RequestHistoryEntry | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [requestId]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/requests/history?requestId=${requestId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch request history");
      }

      const data = await response.json();
      setHistory(data.history);
    } catch (err) {
      console.error("Error fetching request history:", err);
      setError("Failed to load request history");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action as keyof typeof actionIcons] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    return actionColors[action as keyof typeof actionColors] || "bg-gray-500";
  };

  const getActionLabel = (action: string) => {
    return actionLabels[action as keyof typeof actionLabels] || action.replace(/_/g, " ").toUpperCase();
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const variants = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      ordered: "outline",
      fulfilled: "default",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Request History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Request History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">{error}</p>
            <Button variant="outline" onClick={fetchHistory} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Request History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No history available for this request</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Request History</span>
          <Badge variant="outline">{history.length} actions</Badge>
        </CardTitle>
        <CardDescription>
          Complete audit trail of all actions taken on this request
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {history.map((entry, index) => (
            <div key={entry.id} className="relative">
              {/* Timeline connector except for last item */}
              {index < history.length - 1 && (
                <div className="absolute left-5 top-12 w-0.5 h-16 bg-gray-200"></div>
              )}
              
              <div className="flex space-x-4">
                {/* Action icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getActionColor(entry.action)} flex items-center justify-center text-white`}>
                  {getActionIcon(entry.action)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {getActionLabel(entry.action)}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {formatDateTime(entry.createdAt)}
                        </span>
                        {entry.newStatus && getStatusBadge(entry.newStatus)}
                      </div>

                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={entry.user.image || ""} />
                            <AvatarFallback className="text-xs">
                              {entry.user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-600">
                            {entry.user.name} ({entry.user.role.replace("_", " ")})
                          </span>
                        </div>
                      </div>

                      {entry.notes && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-700">{entry.notes}</p>
                        </div>
                      )}

                      {/* Status change indicator */}
                      {entry.oldStatus && entry.newStatus && entry.oldStatus !== entry.newStatus && (
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-sm text-gray-500">Status change:</span>
                          {entry.oldStatus && getStatusBadge(entry.oldStatus)}
                          <span className="text-gray-400">→</span>
                          {entry.newStatus && getStatusBadge(entry.newStatus)}
                        </div>
                      )}

                      {/* Rejection reason */}
                      {entry.metadata?.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded-lg mt-2">
                          <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                          <p className="text-sm text-red-700">{entry.metadata.rejectionReason}</p>
                        </div>
                      )}

                      {/* Equipment assignment info */}
                      {entry.metadata?.equipmentName && (
                        <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg mt-2">
                          <p className="text-sm font-medium text-purple-800">Equipment Assigned:</p>
                          <p className="text-sm text-purple-700">{entry.metadata.equipmentName}</p>
                        </div>
                      )}
                    </div>

                    {/* View details button */}
                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Action Details</DialogTitle>
                            <DialogDescription>
                              Detailed information about this action
                            </DialogDescription>
                          </DialogHeader>
                          {selectedEntry && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-sm font-medium text-gray-500">Action:</span>
                                  <p className="font-medium">{getActionLabel(selectedEntry.action)}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-500">Timestamp:</span>
                                  <p className="font-medium">{formatDateTime(selectedEntry.createdAt)}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-500">User:</span>
                                  <p className="font-medium">{selectedEntry.user.name}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-500">Role:</span>
                                  <p className="font-medium">{selectedEntry.user.role}</p>
                                </div>
                              </div>
                              
                              {selectedEntry.metadata && (
                                <div>
                                  <span className="text-sm font-medium text-gray-500">Additional Data:</span>
                                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}