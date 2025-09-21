// ABOUTME: Advanced equipment assignment workflow with multi-step approval process
// ABOUTME: Handles complex assignment scenarios with team lead approvals, justifications, and audit trails

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
  UserPlus,
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Building,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

interface EquipmentWithOwner {
  id: string;
  name: string;
  serialNumber: string;
  category: string;
  brand?: string;
  model?: string;
  purchasePrice?: number;
  condition?: string;
  currentOwner: {
    id: string;
    name: string;
    email: string;
    role: string;
    team?: {
      id: string;
      name: string;
    };
  } | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  team?: {
    id: string;
    name: string;
    leaderId?: string;
  };
}

interface AssignmentWorkflowProps {
  equipment: EquipmentWithOwner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentUser: User;
}

const assignmentWorkflowSchema = z.object({
  targetUserId: z.string().min(1, "Please select a user"),
  assignmentType: z.enum(["standard", "temporary", "project", "emergency"]),
  justification: z.string().min(10, "Please provide a detailed justification"),
  expectedDuration: z.number().min(1, "Duration must be at least 1 day").optional(),
  specificRequirements: z.string().optional(),
  location: z.string().optional(),
  budgetCode: z.string().optional(),
  approvalNotes: z.string().optional(),
  needsApproval: z.boolean().default(true),
});

type AssignmentWorkflowFormData = z.infer<typeof assignmentWorkflowSchema>;

export function AssignmentWorkflowDialog({
  equipment,
  open,
  onOpenChange,
  onSuccess,
  currentUser,
}: AssignmentWorkflowProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [approvalChain, setApprovalChain] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const form = useForm<AssignmentWorkflowFormData>({
    resolver: zodResolver(assignmentWorkflowSchema),
    defaultValues: {
      assignmentType: "standard",
      justification: "",
      needsApproval: true,
    },
  });

  const watchedAssignmentType = form.watch("assignmentType");
  const watchedTargetUserId = form.watch("targetUserId");

  // Load users and determine approval chain when dialog opens
  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  useEffect(() => {
    if (watchedTargetUserId && users.length > 0) {
      const user = users.find(u => u.id === watchedTargetUserId);
      setSelectedUser(user || null);
      determineApprovalChain(user);
    } else {
      setSelectedUser(null);
      setApprovalChain([]);
    }
  }, [watchedTargetUserId, users]);

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users?active=true");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    }
  };

  const determineApprovalChain = (user: User | null) => {
    if (!user) {
      setApprovalChain([]);
      return;
    }

    const chain: User[] = [];

    // Team lead approval (if user has a team and current user is not the team lead)
    if (user.team && user.team.leaderId && user.team.leaderId !== currentUser.id) {
      const teamLead = users.find(u => u.id === user.team?.leaderId);
      if (teamLead) {
        chain.push(teamLead);
      }
    }

    // Admin approval (for expensive equipment or special cases)
    if (equipment.purchasePrice && equipment.purchasePrice > 1000) {
      const admin = users.find(u => u.role === "admin");
      if (admin && !chain.some(c => c.id === admin.id)) {
        chain.push(admin);
      }
    }

    // Always require approval if assigning to different teams
    if (currentUser.team?.id !== user.team?.id) {
      const admin = users.find(u => u.role === "admin");
      if (admin && !chain.some(c => c.id === admin.id)) {
        chain.push(admin);
      }
    }

    setApprovalChain(chain);
    
    // Update form field for approval requirement
    form.setValue("needsApproval", chain.length > 0);
  };

  const onSubmit = async (data: AssignmentWorkflowFormData) => {
    setIsLoading(true);
    try {
      // Create assignment request with workflow
      const requestData = {
        ...data,
        equipmentId: equipment.id,
        requestedById: currentUser.id,
        approvalChain: approvalChain.map(u => u.id),
        priority: determinePriority(data.assignmentType),
      };

      const response = await fetch("/api/equipment/assignment-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create assignment request");
      }

      const result = await response.json();

      if (approvalChain.length === 0) {
        // Auto-approve if no approval chain
        await performAssignment(data.targetUserId, data.justification);
        toast.success("Equipment assigned successfully");
      } else {
        toast.success(`Assignment request submitted for approval (${approvalChain.length} approver${approvalChain.length > 1 ? 's' : ''})`);
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Assignment workflow error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process assignment request");
    } finally {
      setIsLoading(false);
    }
  };

  const performAssignment = async (userId: string, justification: string) => {
    const response = await fetch(`/api/equipment/${equipment.id}/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        notes: justification,
        assignmentType: watchedAssignmentType,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to assign equipment");
    }
  };

  const determinePriority = (assignmentType: string) => {
    switch (assignmentType) {
      case "emergency": return "urgent";
      case "temporary": return "medium";
      case "project": return "high";
      default: return "medium";
    }
  };

  const getAssignmentTypeDescription = (type: string) => {
    switch (type) {
      case "standard": return "Permanent assignment for regular use";
      case "temporary": return "Short-term assignment with specific end date";
      case "project": return "Assignment for specific project duration";
      case "emergency": return "Urgent assignment requiring immediate action";
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Equipment Assignment Workflow</span>
          </DialogTitle>
          <DialogDescription>
            Assign "{equipment.name}" ({equipment.serialNumber}) with approval workflow
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Assignment Details */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assignment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="targetUserId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign to User</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select user..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users
                                .filter(user => user.id !== currentUser.id)
                                .map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex flex-col">
                                    <span>{user.name}</span>
                                    <span className="text-xs text-gray-500">
                                      {user.email} • {user.role}
                                      {user.team && ` • ${user.team.name}`}
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
                      name="assignmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assignment Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="standard">Standard Assignment</SelectItem>
                              <SelectItem value="temporary">Temporary Assignment</SelectItem>
                              <SelectItem value="project">Project-Based</SelectItem>
                              <SelectItem value="emergency">Emergency Assignment</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {getAssignmentTypeDescription(watchedAssignmentType)}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {(watchedAssignmentType === "temporary" || watchedAssignmentType === "project") && (
                      <FormField
                        control={form.control}
                        name="expectedDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expected Duration (days)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Number of days"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              How long will this assignment be needed?
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usage Location</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Office location, remote, etc."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Equipment Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Equipment Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">{equipment.name}</p>
                        <p className="text-sm text-gray-600">
                          {equipment.brand} {equipment.model}
                        </p>
                        <p className="text-xs font-mono text-gray-500">
                          {equipment.serialNumber}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Category:</span>
                          <p className="font-medium capitalize">
                            {equipment.category.replace("_", " ")}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Value:</span>
                          <p className="font-medium">
                            {equipment.purchasePrice ? `€${equipment.purchasePrice.toLocaleString()}` : "N/A"}
                          </p>
                        </div>
                      </div>

                      {equipment.condition && (
                        <div>
                          <span className="text-gray-600">Condition:</span>
                          <p className="font-medium capitalize">{equipment.condition}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Justification and Approval */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Justification & Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="justification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Justification *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Explain why this equipment is needed..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Provide detailed business reasons for this assignment
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="specificRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specific Requirements</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any special requirements or configurations needed..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional: Technical specifications or special needs
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="budgetCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget Code (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Department budget code..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Approval Workflow */}
                {approvalChain.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <span>Approval Required</span>
                      </CardTitle>
                      <CardDescription>
                        This assignment requires approval from the following people
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {approvalChain.map((approver, index) => (
                          <div key={approver.id} className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                              <span className="text-sm font-medium text-blue-600">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{approver.name}</p>
                              <p className="text-sm text-gray-600">
                                {approver.email} • {approver.role}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {approver.role === "admin" ? "Admin" : "Team Lead"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      
                      <Alert className="mt-4">
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          Approvers will be notified via email and can approve or reject this request.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                )}

                {/* Auto-approval Notice */}
                {approvalChain.length === 0 && selectedUser && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Auto-approval:</strong> This assignment will be processed immediately without requiring approval.
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
                disabled={isLoading || !watchedTargetUserId}
              >
                {isLoading ? "Processing..." : approvalChain.length > 0 ? "Submit for Approval" : "Assign Equipment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}