// ABOUTME: Mobile-optimized equipment detail component with offline support
// ABOUTME: Touch-friendly interface with swipe gestures and offline functionality

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Edit3,
  Camera,
  QrCode,
  Clock,
  User,
  Package,
  Wrench,
  WifiOff,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useOfflineData } from '@/hooks/use-offline-data';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EquipmentDetail {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  category: string;
  brand?: string;
  model?: string;
  description?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  currentOwner?: {
    id: string;
    name: string;
    email: string;
  };
  assignedDate?: Date;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  warrantyExpiry?: Date;
  location?: string;
  notes?: string;
  qrCode?: string;
  photos?: string[];
  maintenanceHistory?: Array<{
    id: string;
    type: string;
    description: string;
    performedBy: string;
    performedAt: Date;
    cost?: number;
  }>;
}

interface MobileEquipmentDetailProps {
  equipment: EquipmentDetail;
  userRole: string;
  userId: string;
  onBack?: () => void;
}

export default function MobileEquipmentDetail({
  equipment,
  userRole,
  userId,
  onBack,
}: MobileEquipmentDetailProps) {
  const {
    isOnline,
    updateEquipmentOffline,
    addMaintenanceLogOffline,
    pendingActions,
  } = useOfflineData();

  const [activeTab, setActiveTab] = useState('overview');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [newStatus, setNewStatus] = useState(equipment.status);
  const [maintenanceData, setMaintenanceData] = useState({
    type: '',
    description: '',
    cost: '',
  });

  const isPendingSync = pendingActions.some(
    action => action.type === 'equipment-update' && action.data.id === equipment.id
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'broken':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'decommissioned':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusOptions = () => {
    const options = [
      { value: 'available', label: 'Available' },
      { value: 'assigned', label: 'Assigned' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'broken', label: 'Broken' },
    ];

    if (userRole === 'admin') {
      options.push({ value: 'decommissioned', label: 'Decommissioned' });
    }

    return options;
  };

  const handleStatusUpdate = async () => {
    if (newStatus === equipment.status) {
      setShowStatusDialog(false);
      return;
    }

    try {
      const success = await updateEquipmentOffline(equipment.id, {
        status: newStatus,
      });

      if (success) {
        if (isOnline) {
          toast.success('Equipment status updated');
        } else {
          toast.success('Status update queued for sync');
        }
        
        // Update local equipment data
        equipment.status = newStatus;
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating equipment status:', error);
      toast.error('Failed to update status');
    }

    setShowStatusDialog(false);
  };

  const handleMaintenanceLog = async () => {
    if (!maintenanceData.type || !maintenanceData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const success = await addMaintenanceLogOffline({
        equipmentId: equipment.id,
        type: maintenanceData.type,
        description: maintenanceData.description,
        cost: maintenanceData.cost ? parseFloat(maintenanceData.cost) : undefined,
        performedBy: userId,
        performedAt: new Date(),
      });

      if (success) {
        if (isOnline) {
          toast.success('Maintenance log added');
        } else {
          toast.success('Maintenance log queued for sync');
        }

        setMaintenanceData({ type: '', description: '', cost: '' });
        setShowMaintenanceDialog(false);
      } else {
        toast.error('Failed to add maintenance log');
      }
    } catch (error) {
      console.error('Error adding maintenance log:', error);
      toast.error('Failed to add maintenance log');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold truncate">{equipment.name}</h1>
            <p className="text-sm text-gray-500">{equipment.serialNumber}</p>
          </div>

          <div className="flex items-center space-x-2">
            {isPendingSync && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Sync
              </Badge>
            )}
            
            {!isOnline && (
              <WifiOff className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Status Banner */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={cn('text-sm font-medium', getStatusColor(equipment.status))}
            >
              {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1)}
            </Badge>
            
            {!isOnline && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                Offline Mode
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs">Maintenance</TabsTrigger>
          <TabsTrigger value="photos" className="text-xs">Photos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="px-4 space-y-4">
          {/* Quick Actions */}
          {(userRole === 'admin' || userRole === 'team_lead') && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStatusDialog(true)}
                    className="h-12 flex-col space-y-1"
                    disabled={isPendingSync}
                  >
                    <Edit3 className="h-4 w-4" />
                    <span className="text-xs">Update Status</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMaintenanceDialog(true)}
                    className="h-12 flex-col space-y-1"
                    disabled={!isOnline}
                  >
                    <Wrench className="h-4 w-4" />
                    <span className="text-xs">Add Maintenance</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Equipment Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Equipment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-600">Category</label>
                  <p>{equipment.category}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">Serial Number</label>
                  <p className="font-mono text-xs">{equipment.serialNumber}</p>
                </div>
                
                {equipment.brand && (
                  <div>
                    <label className="font-medium text-gray-600">Brand</label>
                    <p>{equipment.brand}</p>
                  </div>
                )}
                
                {equipment.model && (
                  <div>
                    <label className="font-medium text-gray-600">Model</label>
                    <p>{equipment.model}</p>
                  </div>
                )}
                
                {equipment.location && (
                  <div>
                    <label className="font-medium text-gray-600">Location</label>
                    <p>{equipment.location}</p>
                  </div>
                )}
              </div>

              {equipment.description && (
                <div>
                  <label className="font-medium text-gray-600">Description</label>
                  <p className="text-sm mt-1">{equipment.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Owner Information */}
          {equipment.currentOwner && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Current Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`/avatars/${equipment.currentOwner.id}.jpg`} />
                    <AvatarFallback>
                      {equipment.currentOwner.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{equipment.currentOwner.name}</p>
                    <p className="text-xs text-gray-500 truncate">{equipment.currentOwner.email}</p>
                    {equipment.assignedDate && (
                      <p className="text-xs text-gray-500">
                        Assigned: {formatDate(equipment.assignedDate)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Purchase Information */}
          {(equipment.purchaseDate || equipment.purchasePrice) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Purchase Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {equipment.purchaseDate && (
                    <div>
                      <label className="font-medium text-gray-600">Purchase Date</label>
                      <p>{formatDate(equipment.purchaseDate)}</p>
                    </div>
                  )}
                  
                  {equipment.purchasePrice && (
                    <div>
                      <label className="font-medium text-gray-600">Purchase Price</label>
                      <p>{formatCurrency(equipment.purchasePrice)}</p>
                    </div>
                  )}
                  
                  {equipment.warrantyExpiry && (
                    <div className="col-span-2">
                      <label className="font-medium text-gray-600">Warranty Expiry</label>
                      <p>{formatDate(equipment.warrantyExpiry)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="px-4 space-y-4">
          {/* Maintenance Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Wrench className="h-4 w-4 mr-2" />
                Maintenance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {equipment.lastMaintenanceDate && (
                  <div>
                    <label className="font-medium text-gray-600">Last Maintenance</label>
                    <p>{formatDate(equipment.lastMaintenanceDate)}</p>
                  </div>
                )}
                
                {equipment.nextMaintenanceDate && (
                  <div>
                    <label className="font-medium text-gray-600">Next Maintenance</label>
                    <p>{formatDate(equipment.nextMaintenanceDate)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Maintenance History */}
          {equipment.maintenanceHistory && equipment.maintenanceHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Maintenance History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {equipment.maintenanceHistory.slice(0, 5).map((record) => (
                    <div key={record.id} className="border-l-2 border-gray-200 pl-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{record.type}</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(record.performedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                      {record.cost && (
                        <p className="text-xs text-gray-500 mt-1">
                          Cost: {formatCurrency(record.cost)}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {equipment.maintenanceHistory.length > 5 && (
                    <Button variant="outline" size="sm" className="w-full" disabled={!isOnline}>
                      View All History
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="px-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Camera className="h-4 w-4 mr-2" />
                Equipment Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {equipment.photos && equipment.photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {equipment.photos.map((photo, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={photo}
                        alt={`${equipment.name} photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No photos available</p>
                  {(userRole === 'admin' || userRole === 'team_lead') && (
                    <Button variant="outline" size="sm" className="mt-4" disabled={!isOnline}>
                      <Camera className="h-4 w-4 mr-2" />
                      Add Photos
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Update Equipment Status</DialogTitle>
            <DialogDescription>
              Change the status of "{equipment.name}"
              {!isOnline && (
                <div className="mt-2 text-orange-600 text-sm">
                  ⚠ Offline mode: Changes will be synced when online
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {getStatusOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={newStatus === equipment.status}>
              {isOnline ? 'Update Status' : 'Queue Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Log Dialog */}
      <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Add Maintenance Log</DialogTitle>
            <DialogDescription>
              Record maintenance performed on "{equipment.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Maintenance Type *</label>
              <Select
                value={maintenanceData.type}
                onValueChange={(value) => setMaintenanceData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="upgrade">Upgrade</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                placeholder="Describe the maintenance performed..."
                value={maintenanceData.description}
                onChange={(e) => setMaintenanceData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Cost (Optional)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={maintenanceData.cost}
                onChange={(e) => setMaintenanceData(prev => ({ ...prev, cost: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMaintenanceLog}>
              {isOnline ? 'Add Log' : 'Queue Log'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}