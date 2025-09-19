// ABOUTME: Dialog component for unassigning equipment from users
// ABOUTME: Handles equipment return process with condition assessment and notes

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Equipment, User } from "@prisma/client";

interface EquipmentUnassignDialogProps {
  equipment: Equipment & { currentOwner: User | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentUnassignDialog({
  equipment,
  open,
  onOpenChange,
}: EquipmentUnassignDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");

  const conditionOptions = [
    { value: "excellent", label: "Excellent - Like new condition" },
    { value: "good", label: "Good - Minor wear, fully functional" },
    { value: "fair", label: "Fair - Some wear, functional" },
    { value: "poor", label: "Poor - Significant wear, may need maintenance" },
    { value: "broken", label: "Broken - Not functional, needs repair" },
  ];

  const handleUnassign = async () => {
    if (!condition) {
      toast.error("Please select the equipment condition");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/equipment/${equipment.id}/unassign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          condition,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to unassign equipment");
      }

      toast.success("Equipment unassigned successfully");
      router.refresh();
      onOpenChange(false);
      setCondition("");
      setNotes("");
    } catch (error) {
      console.error("Unassignment error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to unassign equipment"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!equipment.currentOwner) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Unassign Equipment</DialogTitle>
          <DialogDescription>
            Unassign &quot;{equipment.name}&quot; ({equipment.serialNumber})
            from {equipment.currentOwner.name}. Please assess the equipment
            condition.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium">Current Assignment</h4>
            <div className="text-sm text-gray-600 mt-1">
              <p>
                <strong>User:</strong> {equipment.currentOwner.name}
              </p>
              <p>
                <strong>Email:</strong> {equipment.currentOwner.email}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="condition">Equipment Condition *</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Assess the equipment condition..." />
              </SelectTrigger>
              <SelectContent>
                {conditionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Return Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about the return or equipment condition..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {condition && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium">Next Steps</h4>
              <div className="text-sm text-gray-600 mt-1">
                {condition === "excellent" || condition === "good" ? (
                  <p>Equipment will be marked as available for reassignment.</p>
                ) : condition === "fair" ? (
                  <p>
                    Equipment will be marked as available but may need minor
                    maintenance.
                  </p>
                ) : condition === "poor" ? (
                  <p>
                    Equipment will require maintenance before being available
                    again.
                  </p>
                ) : (
                  <p>Equipment will be marked as broken and require repair.</p>
                )}
              </div>
            </div>
          )}
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
            type="button"
            onClick={handleUnassign}
            disabled={isLoading || !condition}
            variant={condition === "broken" ? "destructive" : "default"}
          >
            {isLoading ? "Processing..." : "Unassign Equipment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
