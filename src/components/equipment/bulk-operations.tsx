// ABOUTME: Comprehensive bulk operations component for equipment management
// ABOUTME: Handles batch operations including assignment, status updates, QR generation, and import/export

'use client';

import { useState, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Trash2,
  UserPlus,
  UserMinus,
  Wrench,
  Archive,
  Download,
  Upload,
  Package,
  AlertTriangle,
  QrCode,
  FileSpreadsheet,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [operationProgress, setOperationProgress] = useState(0);
  const [importData, setImportData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canPerformBulkOperations = userRole === 'admin' || userRole === 'team_lead';
  const isAdmin = userRole === 'admin';

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
      id: 'import',
      label: 'Import CSV',
      icon: Upload,
      description: 'Import equipment data from CSV file',
      roles: ['admin', 'team_lead'],
    },
    {
      id: 'generate_qr',
      label: 'Generate QR Codes',
      icon: QrCode,
      description: 'Generate QR codes for selected equipment',
      roles: ['admin', 'team_lead', 'user'],
    },
    {
      id: 'export_template',
      label: 'Download CSV Template',
      icon: FileSpreadsheet,
      description: 'Download CSV template for bulk import',
      roles: ['admin', 'team_lead'],
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const requiredFields = ['name', 'serialNumber', 'category', 'brand', 'model'];
        const missingFields = requiredFields.filter(field => !headers.includes(field));
        
        if (missingFields.length > 0) {
          setImportErrors([`Missing required fields: ${missingFields.join(', ')}`]);
          return;
        }

        const data = lines.slice(1)
          .filter(line => line.trim())
          .map((line, index) => {
            const values = line.split(',').map(v => v.trim());
            const row: any = {};
            headers.forEach((header, i) => {
              row[header] = values[i] || '';
            });
            row.lineNumber = index + 2; // +2 because we start from line 2 and it's 1-indexed
            return row;
          });

        setImportData(data);
        setImportErrors([]);
      } catch (error) {
        setImportErrors(['Failed to parse CSV file. Please check the format.']);
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/equipment/import-template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'equipment-import-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Template downloaded successfully');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const performImport = async () => {
    if (importData.length === 0) return;
    
    setIsProcessing(true);
    setUploadProgress(0);
    
    try {
      const batchSize = 10;
      const totalBatches = Math.ceil(importData.length / batchSize);
      let successCount = 0;
      const errors: string[] = [];
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = importData.slice(i * batchSize, (i + 1) * batchSize);
        
        try {
          const response = await fetch('/api/equipment/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: batch }),
          });
          
          const result = await response.json();
          
          if (response.ok) {
            successCount += result.successCount || batch.length;
          } else {
            errors.push(...(result.errors || [`Batch ${i + 1} failed: ${result.error}`]));
          }
        } catch (error) {
          errors.push(`Batch ${i + 1} failed: Network error`);
        }
        
        setUploadProgress(((i + 1) / totalBatches) * 100);
      }
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} equipment items`);
        onOperationComplete();
      }
      
      if (errors.length > 0) {
        setImportErrors(errors);
        toast.error(`Import completed with ${errors.length} errors`);
      }
      
      if (errors.length === 0 && successCount > 0) {
        setIsDialogOpen(false);
        setImportData([]);
      }
    } catch (error) {
      toast.error('Import failed completely');
      setImportErrors(['Import failed: ' + (error instanceof Error ? error.message : 'Unknown error')]);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const performOperation = async () => {
    if (!operation || (selectedEquipment.length === 0 && operation !== 'import' && operation !== 'export_template')) return;

    setIsProcessing(true);
    try {
      switch (operation) {
        case 'assign':
          if (!targetUser) return;
          setOperationProgress(0);
          let completed = 0;
          for (const id of selectedEquipment) {
            const response = await fetch(`/api/equipment/${id}/assign`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: targetUser }),
            });
            if (!response.ok) {
              const error = await response.json();
              throw new Error(`Failed to assign equipment ${id}: ${error.error || 'Unknown error'}`);
            }
            completed++;
            setOperationProgress((completed / selectedEquipment.length) * 100);
          }
          break;

        case 'unassign':
          const unassignPromises = selectedEquipment.map(async (id) => {
            const response = await fetch(`/api/equipment/${id}/unassign`, {
              method: 'POST',
            });
            if (!response.ok) {
              const error = await response.json();
              throw new Error(`Failed to unassign equipment ${id}: ${error.error || 'Unknown error'}`);
            }
            return response.json();
          });
          await Promise.all(unassignPromises);
          break;

        case 'change_status':
          if (!newStatus) return;
          const statusPromises = selectedEquipment.map(async (id) => {
            const response = await fetch(`/api/equipment/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) {
              const error = await response.json();
              throw new Error(`Failed to update status for equipment ${id}: ${error.error || 'Unknown error'}`);
            }
            return response.json();
          });
          await Promise.all(statusPromises);
          break;

        case 'export':
          const response = await fetch(`/api/equipment/export?ids=${selectedEquipment.join(',')}`);
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `equipment-export-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Export completed successfully');
          } else {
            toast.error('Export failed');
          }
          break;

        case 'import':
          await performImport();
          return; // Don't close dialog on import as we might have errors to show

        case 'generate_qr':
          const qrResponse = await fetch('/api/equipment/bulk-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ equipmentIds: selectedEquipment }),
          });
          if (qrResponse.ok) {
            const qrBlob = await qrResponse.blob();
            const qrUrl = window.URL.createObjectURL(qrBlob);
            const qrLink = document.createElement('a');
            qrLink.href = qrUrl;
            qrLink.download = `equipment-qr-codes-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(qrLink);
            qrLink.click();
            window.URL.revokeObjectURL(qrUrl);
            document.body.removeChild(qrLink);
            toast.success('QR codes generated successfully');
          } else {
            toast.error('QR code generation failed');
          }
          break;

        case 'export_template':
          await downloadTemplate();
          break;

        case 'delete':
          if (!isAdmin) {
            toast.error('Only administrators can delete equipment');
            return;
          }
          const deletePromises = selectedEquipment.map(async (id) => {
            const response = await fetch(`/api/equipment/${id}`, {
              method: 'DELETE',
            });
            if (!response.ok) {
              const error = await response.json();
              throw new Error(`Failed to delete equipment ${id}: ${error.error || 'Unknown error'}`);
            }
            return response.json();
          });
          await Promise.all(deletePromises);
          break;
      }

      onOperationComplete();
      setIsDialogOpen(false);
      setOperation('');
      setTargetUser('');
      setNewStatus('');
      setImportData([]);
      setImportErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (operation !== 'import' && operation !== 'export_template') {
        const operationNames = {
          assign: `Assigned ${selectedEquipment.length} equipment items`,
          unassign: `Unassigned ${selectedEquipment.length} equipment items`,
          change_status: `Updated status for ${selectedEquipment.length} equipment items`,
          generate_qr: `Generated QR codes for ${selectedEquipment.length} equipment items`,
          delete: `Deleted ${selectedEquipment.length} equipment items`,
          export: `Exported ${selectedEquipment.length} equipment items`,
        };
        toast.success(operationNames[operation as keyof typeof operationNames] || 'Operation completed successfully');
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      toast.error('Operation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
      setOperationProgress(0);
    }
  };

  if (selectedEquipment.length === 0) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-2 border-dashed">
        <div className="flex items-center space-x-3">
          <Package className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Select equipment items to enable bulk operations
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {filteredOperations
            .filter(op => op.id === 'export_template')
            .map((op) => (
              <Button
                key={op.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  setOperation(op.id);
                  setIsDialogOpen(true);
                }}
              >
                <op.icon className="h-4 w-4 mr-2" />
                {op.label}
              </Button>
            ))}
        </div>
      </div>
    );
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
            disabled={!canPerformBulkOperations && op.id !== 'export' && op.id !== 'generate_qr'}
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

            {operation === 'import' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <Input
                    ref={fileInputRef}
                    id="csv-file"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a CSV file with equipment data. Use the template for proper format.
                  </p>
                </div>

                {importData.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">File parsed successfully</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ready to import {importData.length} equipment items
                    </p>
                  </div>
                )}

                {importErrors.length > 0 && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-destructive">Import Errors</h4>
                        <div className="mt-1 space-y-1">
                          {importErrors.map((error, index) => (
                            <p key={index} className="text-xs text-destructive">
                              {error}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isProcessing && uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Importing...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            )}

            {/* Operation Progress for bulk operations */}
            {isProcessing && operation !== 'import' && operation !== 'export_template' && operationProgress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing {selectedEquipment.length} items...</span>
                  <span>{Math.round(operationProgress)}%</span>
                </div>
                <Progress value={operationProgress} className="h-2" />
              </div>
            )}

            {operation === 'generate_qr' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <QrCode className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">QR Code Generation</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This will generate QR codes for {selectedEquipment.length} equipment item(s) and download them as a PDF file.
                    </p>
                  </div>
                </div>
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
                    {!isAdmin && (
                      <p className="text-sm text-destructive mt-2 font-medium">
                        Only administrators can delete equipment.
                      </p>
                    )}
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
                disabled={
                  isProcessing || 
                  (operation === 'assign' && !targetUser) || 
                  (operation === 'change_status' && !newStatus) ||
                  (operation === 'import' && (importData.length === 0 || importErrors.length > 0)) ||
                  (operation === 'delete' && !isAdmin)
                }
                variant={operation === 'delete' ? 'destructive' : 'default'}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {operation === 'import' ? 'Importing...' : 'Processing...'}
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}