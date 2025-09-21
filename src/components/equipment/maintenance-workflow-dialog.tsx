// ABOUTME: Comprehensive maintenance workflow dialog for equipment lifecycle management
// ABOUTME: Handles maintenance scheduling, tracking, and completion with approval workflows

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wrench,
  Calendar,
  DollarSign,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  FileText,
  Package,
} from "lucide-react";
import { toast } from "sonner";

interface EquipmentWithDetails {
  id: string;
  name: string;
  serialNumber: string;
  category: string;
  brand?: string;
  model?: string;
  purchasePrice?: number;
  condition?: string;
  status: string;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  warrantyExpiry?: Date;
  currentOwner?: {
    id: string;
    name: string;
    email: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MaintenanceWorkflowDialogProps {
  equipment: EquipmentWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentUser: User;
}

const maintenanceWorkflowSchema = z.object({
  type: z.enum(["preventive", "corrective", "emergency", "upgrade", "inspection"]),
  description: z.string().min(10, "Description must be at least 10 characters"),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  estimatedCost: z.number().min(0, "Cost must be positive").optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignedTo: z.string().optional(),
  vendor: z.string().optional(),
  expectedDuration: z.number().min(1, "Duration must be at least 1 hour").optional(),
  partsRequired: z.string().optional(),
  notes: z.string().max(2000).optional(),
  warrantyClaim: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  approvalNotes: z.string().optional(),
});

type MaintenanceWorkflowFormData = z.infer<typeof maintenanceWorkflowSchema>;

export function MaintenanceWorkflowDialog({
  equipment,
  open,
  onOpenChange,
  onSuccess,
  currentUser,
}: MaintenanceWorkflowDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [requiresApproval, setRequiresApproval] = useState(false);

  const form = useForm<MaintenanceWorkflowFormData>({
    resolver: zodResolver(maintenanceWorkflowSchema),
    defaultValues: {
      type: "preventive",
      description: "",
      scheduledDate: "",
      priority: "medium",
      warrantyClaim: false,
      requiresApproval: false,
    },
  });

  const watchedType = form.watch("type");
  const watchedEstimatedCost = form.watch("estimatedCost");
  const watchedPriority = form.watch("priority");

  // Load users and maintenance history when dialog opens
  useEffect(() => {
    if (open) {
      loadUsers();
      loadMaintenanceHistory();
      determineApprovalRequirements();
    }
  }, [open]);

  // Update approval requirements based on cost and type
  useEffect(() => {
    determineApprovalRequirements();
  }, [watchedEstimatedCost, watchedType, watchedPriority]);

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users?active=true");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const loadMaintenanceHistory = async () => {
    try {
      const response = await fetch(`/api/equipment/${equipment.id}/maintenance-workflow`);
      if (response.ok) {
        const data = await response.json();
        setMaintenanceHistory(data.maintenanceHistory || []);
      }
    } catch (error) {
      console.error("Failed to load maintenance history:", error);
    }
  };

  const determineApprovalRequirements = () => {
    let approvalNeeded = false;

    // High cost maintenance requires approval
    if (watchedEstimatedCost && watchedEstimatedCost > 500) {
      approvalNeeded = true;
    }

    // Emergency maintenance requires approval
    if (watchedType === "emergency") {
      approvalNeeded = true;
    }

    // High priority requires approval
    if (watchedPriority === "urgent") {
      approvalNeeded = true;
    }

    // Non-admin users require approval for maintenance
    if (currentUser.role !== "admin") {
      approvalNeeded = true;
    }

    setRequiresApproval(approvalNeeded);
    form.setValue("requiresApproval", approvalNeeded);
  };

  const onSubmit = async (data: MaintenanceWorkflowFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/equipment/${equipment.id}/maintenance-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create maintenance request");
      }

      const result = await response.json();

      if (requiresApproval) {
        toast.success("Maintenance request submitted for approval");
      } else {
        toast.success("Maintenance scheduled successfully");
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Maintenance workflow error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process maintenance request");
    } finally {
      setIsLoading(false);
    }
  };

  const getMaintenanceTypeDescription = (type: string) => {
    switch (type) {
      case "preventive": return "Scheduled maintenance to prevent issues";
      case "corrective": return "Fixing existing problems or faults";
      case "emergency": return "Urgent repairs for critical failures";
      case "upgrade": return "Improving equipment capabilities";
      case "inspection": return "Routine check and assessment";
      default: return "";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const daysSinceLastMaintenance = () => {
    if (!equipment.lastMaintenanceDate) return "Never";
    const days = Math.floor((Date.now() - new Date(equipment.lastMaintenanceDate).getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days ago`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>Maintenance Workflow - {equipment.name}</span>
          </DialogTitle>
          <DialogDescription>
            Schedule and manage maintenance for {equipment.serialNumber}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Equipment Info */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Equipment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">{equipment.name}</p>
                      <p className="text-sm text-gray-600">
                        {equipment.brand} {equipment.model}
                      </p>
                      <p className="text-xs font-mono text-gray-500">
                        {equipment.serialNumber}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Category:</span>
                        <p className="font-medium capitalize">
                          {equipment.category.replace("_", " ")}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <Badge variant="outline" className="text-xs">
                          {equipment.status}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-600">Last Maintenance:</span>
                      <p className="text-sm font-medium">
                        {daysSinceLastMaintenance()}
                      </p>
                    </div>

                    {equipment.condition && (
                      <div>
                        <span className="text-gray-600">Condition:</span>
                        <p className="text-sm font-medium capitalize">
                          {equipment.condition}
                        </p>
                      </div>
                    )}

                    {equipment.warrantyExpiry && new Date(equipment.warrantyExpiry) > new Date() && (
                      <div className="p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-xs text-green-800">
                          Under warranty until {new Date(equipment.warrantyExpiry).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Maintenance History */}
                {maintenanceHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Recent Maintenance</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {maintenanceHistory.slice(0, 3).map((record) => (
                          <div key={record.id} className="p-2 bg-gray-50 rounded text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize">
                                {record.type}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {record.status}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mt-1">
                              {new Date(record.date || record.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Middle Column - Maintenance Details */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Maintenance Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maintenance Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="preventive">Preventive</SelectItem>
                              <SelectItem value="corrective">Corrective</SelectItem>
                              <SelectItem value="emergency">Emergency</SelectItem>
                              <SelectItem value="upgrade">Upgrade</SelectItem>
                              <SelectItem value="inspection">Inspection</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {getMaintenanceTypeDescription(watchedType)}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            When should this maintenance be performed?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the maintenance work needed..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Detailed description of the maintenance required
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expectedDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Duration (hours)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="8"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Estimated time to complete the maintenance
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="partsRequired"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parts Required</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="List any parts or materials needed..."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Cost & Assignment */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cost & Assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="estimatedCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Cost (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Estimated cost for parts and labor
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor/Technician</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Maintenance provider or technician..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Who will perform the maintenance?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assignedTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned To</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select technician..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users
                                .filter(user => user.role === "admin" || user.role === "team_lead")
                                .map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex flex-col">
                                    <span>{user.name}</span>
                                    <span className="text-xs text-gray-500">
                                      {user.email} • {user.role}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="warrantyClaim"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Warranty Claim</FormLabel>
                            <FormDescription>
                              This maintenance is covered under warranty
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any additional information..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Approval Requirements */}
                {requiresApproval && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span>Approval Required</span>
                      </CardTitle>
                      <CardDescription>
                        This maintenance request requires approval before it can be scheduled
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Approval needed:</strong> This maintenance request will be reviewed by an administrator.
                          You will be notified once approved.
                        </AlertDescription>
                      </Alert>
                      
                      <FormField
                        control={form.control}
                        name="approvalNotes"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Justification for Approval</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Explain why this maintenance is necessary..."
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Provide justification for the approval committee
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Auto-approval Notice */}
                {!requiresApproval && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Auto-approval:</strong> This maintenance will be scheduled immediately without requiring approval.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : requiresApproval ? "Submit for Approval" : "Schedule Maintenance"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}