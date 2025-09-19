// ABOUTME: Dialog component for assigning equipment to users
// ABOUTME: Provides user selection and assignment functionality with validation

"use client";

import { useState, useEffect } from "react";
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

interface EquipmentAssignDialogProps {
  equipment: Equipment & { currentOwner: User | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentAssignDialog({
  equipment,
  open,
  onOpenChange,
}: EquipmentAssignDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch active users when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users?active=true");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/equipment/${equipment.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUserId,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign equipment");
      }

      toast.success("Equipment assigned successfully");
      router.refresh();
      onOpenChange(false);
      setSelectedUserId("");
      setNotes("");
    } catch (error) {
      console.error("Assignment error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to assign equipment"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = users.find((user) => user.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Equipment</DialogTitle>
          <DialogDescription>
            Assign &quot;{equipment.name}&quot; ({equipment.serialNumber}) to a
            user. This will update the equipment status and create a history
            record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="user">Select User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs text-gray-500">
                        {user.email}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUser && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium">Assignment Details</h4>
              <div className="text-sm text-gray-600 mt-1">
                <p>
                  <strong>User:</strong> {selectedUser.name}
                </p>
                <p>
                  <strong>Email:</strong> {selectedUser.email}
                </p>
                <p>
                  <strong>Role:</strong>{" "}
                  {selectedUser.role.replace("_", " ").toUpperCase()}
                </p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={3}
            />
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
            type="button"
            onClick={handleAssign}
            disabled={isLoading || !selectedUserId}
          >
            {isLoading ? "Assigning..." : "Assign Equipment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
