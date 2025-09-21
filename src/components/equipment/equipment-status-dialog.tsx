// ABOUTME: Equipment status management dialog for comprehensive status transitions
// ABOUTME: Handles equipment lifecycle management with validation, business rules, and history tracking

"use client";

import { useState } from "react";
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
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  Archive,
  Users,
  MapPin,
} from "lucide-react";
import type { Equipment, EquipmentStatus } from "@/types";

interface EquipmentStatusDialogProps {
  equipment: Equipment & {
    currentOwner: { id: string; name: string; email: string } | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const statusTransitionSchema = z.object({
  status: z.enum([
    "pending", 
    "available", 
    "assigned", 
    "maintenance", 
    "broken", 
    "lost", 
    "stolen", 
    "decommissioned"
  ]),
  reason: z.string().min(1, "Reason is required for status change"),
  notes: z.string().max(1000).optional(),
  condition: z.enum(["excellent", "good", "fair", "poor", "broken"]).optional(),
  estimatedReturnDate: z.string().optional(),
  maintenanceProvider: z.string().optional(),
  lossReport: z.object({
    date: z.string(),
    location: z.string(),
    circumstances: z.string().min(10, "Please provide detailed circumstances"),
    policeReportNumber: z.string().optional(),
  }).optional(),
});

type StatusTransitionFormData = z.infer<typeof statusTransitionSchema>;

const statusDescriptions: Record<EquipmentStatus, string> = {
  pending: "Equipment is awaiting setup or configuration",
  available: "Equipment is ready for assignment",
  assigned: "Equipment is currently assigned to a user",
  maintenance: "Equipment is under repair or maintenance",
  broken: "Equipment is broken and needs repair",
  lost: "Equipment has been reported as lost",
  stolen: "Equipment has been reported as stolen",
  decommissioned: "Equipment is no longer in service",
};

const statusIcons: Record<EquipmentStatus, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  pending: Clock,
  available: CheckCircle,
  assigned: Users,
  maintenance: Wrench,
  broken: AlertTriangle,
  lost: MapPin,
  stolen: AlertTriangle,
  decommissioned: Archive,
};

export function EquipmentStatusDialog({
  equipment,
  open,
  onOpenChange,
  onSuccess,
}: EquipmentStatusDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableTransitions, setAvailableTransitions] = useState<EquipmentStatus[]>([]);

  const form = useForm<StatusTransitionFormData>({
    resolver: zodResolver(statusTransitionSchema),
    defaultValues: {
      status: equipment.status as EquipmentStatus,
      reason: "",
      notes: "",
    },
  });

  const watchedStatus = form.watch("status");

  // Load available status transitions when dialog opens
  const handleOpenChange = async (newOpen: boolean) => {
    if (newOpen && !availableTransitions.length) {
      try {
        const response = await fetch(`/api/equipment/${equipment.id}/status`);
        if (response.ok) {
          const data = await response.json();
          setAvailableTransitions(data.allowedTransitions);
        }
      } catch (error) {
        console.error("Error loading status transitions:", error);
      }
    }
    onOpenChange(newOpen);
  };

  const onSubmit = async (data: StatusTransitionFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/equipment/${equipment.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update equipment status");
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error updating equipment status:", error);
      // You could add a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const currentStatus = equipment.status as EquipmentStatus;
  const StatusIcon = statusIcons[watchedStatus];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <StatusIcon className="h-5 w-5" />
            <span>Change Equipment Status</span>
          </DialogTitle>
          <DialogDescription>
            Update the status of {equipment.name} ({equipment.serialNumber})
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Current Status */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current Status</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">{currentStatus.toUpperCase()}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {statusDescriptions[currentStatus]}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* New Status Selection */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTransitions.map((status) => {
                        const StatusIcon = statusIcons[status];
                        return (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center space-x-2">
                              <StatusIcon className="h-4 w-4" />
                              <span>{status.toUpperCase()}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {watchedStatus !== currentStatus && statusDescriptions[watchedStatus]}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason for Change */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Status Change *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain why this status change is necessary..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Condition (for certain status transitions) */}
            {(watchedStatus === "available" || watchedStatus === "maintenance") && (
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment Condition</FormLabel>
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
                    <FormDescription>
                      Current physical condition of the equipment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Maintenance Provider (for maintenance status) */}
            {watchedStatus === "maintenance" && (
              <FormField
                control={form.control}
                name="maintenanceProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Provider</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter maintenance provider or technician..."
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
            )}

            {/* Loss Report (for lost/stolen status) */}
            {(watchedStatus === "lost" || watchedStatus === "stolen") && (
              <div className="space-y-4 p-4 border border-orange-200 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-800 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Loss/ Theft Report</span>
                </h4>
                
                <FormField
                  control={form.control}
                  name="lossReport.date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Incident</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lossReport.location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Where did this incident occur?"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lossReport.circumstances"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Circumstances</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide detailed circumstances of the loss/theft..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include all relevant details for insurance and reporting purposes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedStatus === "stolen" && (
                  <FormField
                    control={form.control}
                    name="lossReport.policeReportNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Police Report Number (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter police report number if available"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Additional Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about this status change..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional additional context for this status transition
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning for Decommission */}
            {watchedStatus === "decommissioned" && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Decommissioning equipment is permanent. 
                  This action cannot be undone and the equipment will no longer be available for assignment.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating Status..." : "Update Status"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}