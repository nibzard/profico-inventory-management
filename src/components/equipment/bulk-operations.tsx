'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Trash2,
  UserPlus,
  UserMinus,
  Wrench,
  Archive,
  Download,
  Upload,
  Package,
  AlertTriangle
} from 'lucide-react';
import type { Equipment } from '@prisma/client';

interface BulkOperationProps {
  selectedEquipment: string[];
  onOperationComplete: () => void;
  users: { id: string; name: string }[];
  userRole: string;
}

interface EquipmentWithOwner extends Equipment {
  currentOwner: {
    id: string;
    name: string;
  } | null;
}

export function BulkOperations({
  selectedEquipment,
  onOperationComplete,
  users,
  userRole,
}: BulkOperationProps) {
  const [operation, setOperation] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const canPerformBulkOperations = userRole === 'admin' || userRole === 'team_lead';

  const operations = [
    {
      id: 'assign',
      label: 'Assign to User',
      icon: UserPlus,
      description: 'Assign selected equipment to a specific user',
      roles: ['admin', 'team_lead'],
    },
    {
      id: 'unassign',
      label: 'Unassign All',
      icon: UserMinus,
      description: 'Remove all users from selected equipment',
      roles: ['admin', 'team_lead'],
    },
    {
      id: 'change_status',
      label: 'Change Status',
      icon: Wrench,
      description: 'Update status for all selected equipment',
      roles: ['admin', 'team_lead'],
    },
    {
      id: 'export',
      label: 'Export Data',
      icon: Download,
      description: 'Export selected equipment data to Excel',
      roles: ['admin', 'team_lead', 'user'],
    },
    {
      id: 'delete',
      label: 'Delete Equipment',
      icon: Trash2,
      description: 'Permanently delete selected equipment',
      roles: ['admin'],
      danger: true,
    },
  ];

  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'broken', label: 'Broken' },
    { value: 'decommissioned', label: 'Decommissioned' },
  ];

  const filteredOperations = operations.filter(op => 
    op.roles.includes(userRole)
  );

  const performOperation = async () => {
    if (!operation || selectedEquipment.length === 0) return;

    setIsProcessing(true);
    try {
      switch (operation) {
        case 'assign':
          if (!targetUser) return;
          await Promise.all(
            selectedEquipment.map(id =>
              fetch(`/api/equipment/${id}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: targetUser }),
              })
            )
          );
          break;

        case 'unassign':
          await Promise.all(
            selectedEquipment.map(id =>
              fetch(`/api/equipment/${id}/unassign`, {
                method: 'POST',
              })
            )
          );
          break;

        case 'change_status':
          if (!newStatus) return;
          await Promise.all(
            selectedEquipment.map(id =>
              fetch(`/api/equipment/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
              })
            )
          );
          break;

        case 'export':
          const response = await fetch(`/api/equipment/export?ids=${selectedEquipment.join(',')}`);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `equipment-export-${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          break;

        case 'delete':
          await Promise.all(
            selectedEquipment.map(id =>
              fetch(`/api/equipment/${id}`, {
                method: 'DELETE',
              })
            )
          );
          break;
      }

      onOperationComplete();
      setIsDialogOpen(false);
      setOperation('');
      setTargetUser('');
      setNewStatus('');
    } catch (error) {
      console.error('Error performing bulk operation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedEquipment.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
      <div className="flex items-center space-x-3">
        <Checkbox checked id="select-all" disabled />
        <Label htmlFor="select-all" className="font-medium">
          {selectedEquipment.length} selected
        </Label>
        <Badge variant="secondary">{selectedEquipment.length} items</Badge>
      </div>

      <div className="flex items-center space-x-2">
        {filteredOperations.map((op) => (
          <Button
            key={op.id}
            variant={op.danger ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => {
              setOperation(op.id);
              setIsDialogOpen(true);
            }}
            disabled={!canPerformBulkOperations}
          >
            <op.icon className="h-4 w-4 mr-2" />
            {op.label}
          </Button>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {operations.find(o => o.id === operation)?.label}
            </DialogTitle>
            <DialogDescription>
              {operations.find(o => o.id === operation)?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {operation === 'assign' && (
              <div>
                <Label htmlFor="target-user">Assign to User</Label>
                <Select value={targetUser} onValueChange={setTargetUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {operation === 'change_status' && (
              <div>
                <Label htmlFor="new-status">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {operation === 'delete' && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive">Permanent Action</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      This will permanently delete {selectedEquipment.length} equipment item(s). 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={performOperation}
                disabled={isProcessing || (operation === 'assign' && !targetUser) || (operation === 'change_status' && !newStatus)}
                variant={operation === 'delete' ? 'destructive' : 'default'}
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}