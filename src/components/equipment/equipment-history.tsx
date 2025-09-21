// ABOUTME: Equipment history tracking component for comprehensive audit trail
// ABOUTME: Displays equipment history with filtering, search, and detailed analytics

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  History,
  Search,
  Filter,
  Calendar,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  Users,
  Plus,
  Download,
  RefreshCw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { EquipmentHistory } from "@prisma/client";

interface EquipmentHistoryProps {
  equipmentId: string;
  equipmentName: string;
  canAddManualEntries: boolean;
}

interface HistoryAnalytics {
  totalEntries: number;
  uniqueUsers: number;
  statusChanges: number;
  assignments: number;
  maintenanceEvents: number;
  mostActiveUser?: {
    id: string;
    name: string;
    email: string;
    actionCount: number;
  };
  recentActivity: number;
}

interface HistoryEntry extends EquipmentHistory {
  equipment?: {
    id: string;
    name: string;
    serialNumber: string;
    category: string;
    status: string;
  };
  fromUser?: {
    id: string;
    name: string;
    email: string;
  };
  toUser?: {
    id: string;
    name: string;
    email: string;
  };
  performedBy?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

const manualHistorySchema = z.object({
  action: z.string().min(1, "Action is required"),
  notes: z.string().min(1, "Notes are required"),
  condition: z.enum(["excellent", "good", "fair", "poor", "broken"]).optional(),
  date: z.string().optional(),
});

type ManualHistoryFormData = z.infer<typeof manualHistorySchema>;

const actionIcons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  ASSIGNED: Users,
  TRANSFERRED: Users,
  RETURNED: CheckCircle,
  STATUS_AVAILABLE: CheckCircle,
  STATUS_ASSIGNED: Users,
  STATUS_MAINTENANCE: Wrench,
  STATUS_BROKEN: AlertTriangle,
  STATUS_LOST: MapPin,
  STATUS_STOLEN: AlertTriangle,
  STATUS_DECOMMISSIONED: Clock,
  CREATED: Plus,
  UPDATED: RefreshCw,
};

const actionColors: Record<string, string> = {
  ASSIGNED: "bg-blue-100 text-blue-800",
  TRANSFERRED: "bg-purple-100 text-purple-800",
  RETURNED: "bg-green-100 text-green-800",
  STATUS_AVAILABLE: "bg-green-100 text-green-800",
  STATUS_ASSIGNED: "bg-blue-100 text-blue-800",
  STATUS_MAINTENANCE: "bg-yellow-100 text-yellow-800",
  STATUS_BROKEN: "bg-red-100 text-red-800",
  STATUS_LOST: "bg-orange-100 text-orange-800",
  STATUS_STOLEN: "bg-red-100 text-red-800",
  STATUS_DECOMMISSIONED: "bg-gray-100 text-gray-800",
  CREATED: "bg-indigo-100 text-indigo-800",
  UPDATED: "bg-gray-100 text-gray-800",
};

export function EquipmentHistoryComponent({
  equipmentId,
  equipmentName,
  canAddManualEntries,
}: EquipmentHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [analytics, setAnalytics] = useState<HistoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "",
    dateFrom: "",
    dateTo: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<ManualHistoryFormData>({
    resolver: zodResolver(manualHistorySchema),
    defaultValues: {
      action: "",
      notes: "",
    },
  });

  const fetchHistory = async () => {
    try {
      const params = new URLSearchParams({
        equipmentId,
        includeEquipment: "true",
        includeUsers: "true",
        ...filters,
      });

      const response = await fetch(`/api/equipment/history?${params}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [equipmentId, filters]);

  const onSubmitManualEntry = async (data: ManualHistoryFormData) => {
    try {
      const response = await fetch(`/api/equipment/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          equipmentId,
        }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        form.reset();
        fetchHistory();
      }
    } catch (error) {
      console.error("Error adding manual history entry:", error);
    }
  };

  const exportHistory = async () => {
    try {
      const params = new URLSearchParams({
        equipmentId,
        includeEquipment: "true",
        includeUsers: "true",
      });

      const response = await fetch(`/api/equipment/history/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${equipmentName}-history-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting history:", error);
    }
  };

  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action] || History;
    return <Icon className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    return actionColors[action] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <History className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.totalHistoryEvents}</p>
                  <p className="text-sm text-gray-600">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.uniqueOwnerCount}</p>
                  <p className="text-sm text-gray-600">Unique Owners</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Wrench className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.maintenanceCount}</p>
                  <p className="text-sm text-gray-600">Maintenance Events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.ageInDays}</p>
                  <p className="text-sm text-gray-600">Days in Service</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Equipment History</span>
              </CardTitle>
              <CardDescription>
                Complete audit trail for {equipmentName}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {canAddManualEntries && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Manual History Entry</DialogTitle>
                      <DialogDescription>
                        Add a manual entry to the equipment history
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmitManualEntry)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="action"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Action</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., MANUAL_CHECK, INSPECTION_COMPLETED" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="condition"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Condition (Optional)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select condition" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="excellent">Excellent</SelectItem>
                                  <SelectItem value="good">Good</SelectItem>
                                  <SelectItem value="fair">Fair</SelectItem>
                                  <SelectItem value="poor">Poor</SelectItem>
                                  <SelectItem value="broken">Broken</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date (Optional)</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormDescription>
                                Leave empty for current date
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe what happened..."
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Add Entry</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
              
              <Button variant="outline" size="sm" onClick={exportHistory}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Filter by action..."
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-48"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-40"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-40"
              />
            </div>
            
            <Button variant="outline" size="sm" onClick={fetchHistory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No history records found</p>
              </div>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <div className={`p-2 rounded-full ${getActionColor(entry.action)}`}>
                    {getActionIcon(entry.action)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getActionColor(entry.action)}>
                        {entry.action.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {entry.notes && (
                      <p className="text-sm mt-1 text-gray-700">{entry.notes}</p>
                    )}
                    
                    {entry.condition && (
                      <Badge variant="secondary" className="mt-1">
                        Condition: {entry.condition}
                      </Badge>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      {entry.fromUser && (
                        <span>From: {entry.fromUser.name}</span>
                      )}
                      {entry.toUser && (
                        <span>To: {entry.toUser.name}</span>
                      )}
                      {entry.performedBy && (
                        <div className="flex items-center space-x-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={entry.performedBy.image || ""} />
                            <AvatarFallback className="text-xs">
                              {entry.performedBy.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span>By: {entry.performedBy.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}