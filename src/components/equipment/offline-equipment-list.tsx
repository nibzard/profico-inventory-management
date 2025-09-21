// ABOUTME: Offline-capable equipment list component with cached data support
// ABOUTME: Works with IndexedDB for offline viewing and queues actions for sync

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  MoreHorizontal,
  Eye,
  Edit,
  UserPlus,
  UserMinus,
  Wrench,
  QrCode,
  WifiOff,
  Clock,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { useOfflineData } from '@/hooks/use-offline-data';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface OfflineEquipment {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  category: string;
  brand?: string;
  model?: string;
  currentOwner?: any;
  lastCached: number;
}

interface OfflineEquipmentListProps {
  fallbackEquipment?: OfflineEquipment[];
  userRole: string;
  userId: string;
}

export default function OfflineEquipmentList({
  fallbackEquipment = [],
  userRole,
  userId,
}: OfflineEquipmentListProps) {
  const {
    isOnline,
    getCachedEquipment,
    updateEquipmentOffline,
    cacheEquipment,
    pendingActions,
  } = useOfflineData();

  const [equipment, setEquipment] = useState<OfflineEquipment[]>(fallbackEquipment);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<OfflineEquipment | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Load cached equipment on mount
  useEffect(() => {
    const loadEquipment = async () => {
      setLoading(true);
      
      if (isOnline && fallbackEquipment.length > 0) {
        // If online and we have fresh data, use it and cache it
        setEquipment(fallbackEquipment);
        await cacheEquipment(fallbackEquipment);
      } else {
        // Load from cache
        const cached = await getCachedEquipment();
        if (cached.length > 0) {
          setEquipment(cached);
        } else if (fallbackEquipment.length > 0) {
          setEquipment(fallbackEquipment);
        }
      }
      
      setLoading(false);
    };

    loadEquipment();
  }, [isOnline, fallbackEquipment, getCachedEquipment, cacheEquipment]);

  // Filter equipment based on search and status
  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;

    // For regular users, only show their equipment or available equipment
    if (userRole === 'user') {
      const isOwned = item.currentOwner?.id === userId;
      const isAvailable = item.status === 'available';
      return matchesSearch && matchesStatus && (isOwned || isAvailable);
    }

    return matchesSearch && matchesStatus;
  });

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
    if (!selectedItem || !newStatus) return;

    try {
      const success = await updateEquipmentOffline(selectedItem.id, {
        status: newStatus,
      });

      if (success) {
        // Update local state
        setEquipment(prev => prev.map(item => 
          item.id === selectedItem.id 
            ? { ...item, status: newStatus }
            : item
        ));

        if (isOnline) {
          toast.success('Equipment status updated');
        } else {
          toast.success('Status update queued for sync');
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating equipment status:', error);
      toast.error('Failed to update status');
    }

    setShowStatusDialog(false);
    setSelectedItem(null);
    setNewStatus('');
  };

  const openStatusDialog = (item: OfflineEquipment) => {
    setSelectedItem(item);
    setNewStatus(item.status);
    setShowStatusDialog(true);
  };

  const isPendingSync = (equipmentId: string) => {
    return pendingActions.some(
      action => action.type === 'equipment-update' && 
                action.data.id === equipmentId
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600">Loading equipment...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="broken">Broken</SelectItem>
            {userRole === 'admin' && (
              <SelectItem value="decommissioned">Decommissioned</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Offline Status Banner */}
      {!isOnline && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-3">
            <div className="flex items-center space-x-2 text-orange-700">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">
                Offline Mode - Showing cached data
              </span>
              {pendingActions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingActions.length} pending sync
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment Grid */}
      {filteredEquipment.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-500">
              {equipment.length === 0 ? (
                <>
                  <WifiOff className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No cached equipment data available</p>
                  <p className="text-sm mt-2">Connect to the internet to load equipment</p>
                </>
              ) : (
                <>
                  <p>No equipment matches your search criteria</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                    }}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipment.map((item) => (
            <Card key={item.id} className="relative overflow-hidden">
              {isPendingSync(item.id) && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    <Clock className="h-3 w-3 mr-1" />
                    Syncing
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{item.name}</CardTitle>
                    <CardDescription className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-500">
                        {item.serialNumber}
                      </span>
                      {!isOnline && (
                        <Badge variant="outline" className="text-xs">
                          Cached
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/equipment/${item.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      
                      {(userRole === 'admin' || userRole === 'team_lead') && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => openStatusDialog(item)}
                            disabled={!isOnline && isPendingSync(item.id)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Update Status
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem disabled={!isOnline}>
                            <Wrench className="h-4 w-4 mr-2" />
                            Add Maintenance
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      <DropdownMenuItem disabled={!isOnline}>
                        <QrCode className="h-4 w-4 mr-2" />
                        Show QR Code
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={cn('text-xs font-medium', getStatusColor(item.status))}
                  >
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Badge>
                  
                  <span className="text-sm text-gray-500">{item.category}</span>
                </div>

                {item.brand && item.model && (
                  <div className="text-sm text-gray-600">
                    {item.brand} {item.model}
                  </div>
                )}

                {item.currentOwner && (
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={`/avatars/${item.currentOwner.id}.jpg`} />
                      <AvatarFallback className="text-xs">
                        {item.currentOwner.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600 truncate">
                      {item.currentOwner.name || item.currentOwner.email}
                    </span>
                  </div>
                )}

                {!isOnline && item.lastCached && (
                  <div className="text-xs text-gray-500 pt-1 border-t">
                    Cached: {new Date(item.lastCached).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Equipment Status</DialogTitle>
            <DialogDescription>
              Change the status of "{selectedItem?.name}"
              {!isOnline && (
                <div className="mt-2 text-orange-600 text-sm">
                  ⚠ Offline mode: Changes will be synced when you're back online
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
            <Button onClick={handleStatusUpdate} disabled={!newStatus || newStatus === selectedItem?.status}>
              {isOnline ? 'Update Status' : 'Queue Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}