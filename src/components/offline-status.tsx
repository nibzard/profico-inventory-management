// ABOUTME: Component for displaying connection status and offline indicators
// ABOUTME: Shows sync status, pending actions count, and provides manual sync trigger

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { useOfflineData } from '@/hooks/use-offline-data';
import { cn } from '@/lib/utils';

export default function OfflineStatus() {
  const {
    isOnline,
    pendingActions,
    syncStatus,
    syncPendingActions,
    getCacheStats,
  } = useOfflineData();
  
  const [cacheStats, setCacheStats] = useState<{
    cachedEquipment: number;
    cachedUsers: number;
    pendingActions: number;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateCacheStats = async () => {
      const stats = await getCacheStats();
      setCacheStats(stats);
    };

    updateCacheStats();
    const interval = setInterval(updateCacheStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [getCacheStats, pendingActions]);

  const handleSync = async () => {
    if (syncStatus === 'syncing') return;
    await syncPendingActions();
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }

    if (syncStatus === 'syncing') {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }

    if (pendingActions.length > 0) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    }

    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }

    if (syncStatus === 'syncing') {
      return 'Syncing...';
    }

    if (pendingActions.length > 0) {
      return `${pendingActions.length} pending`;
    }

    return 'Online';
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-50 border-red-200 text-red-700';
    if (syncStatus === 'syncing') return 'bg-blue-50 border-blue-200 text-blue-700';
    if (pendingActions.length > 0) return 'bg-orange-50 border-orange-200 text-orange-700';
    return 'bg-green-50 border-green-200 text-green-700';
  };

  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2 border transition-colors',
            getStatusColor()
          )}
        >
          {getStatusIcon()}
          <span className="ml-2 text-sm font-medium">
            {getStatusText()}
          </span>
          {pendingActions.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 text-xs">
              {pendingActions.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {isOnline ? 'Connected' : 'Offline Mode'}
              </span>
            </div>

            {isOnline && pendingActions.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={syncStatus === 'syncing'}
                className="h-7"
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Sync
              </Button>
            )}
          </div>

          {/* Status Description */}
          <div className="text-sm text-gray-600">
            {!isOnline ? (
              <p>You're working offline. Changes will sync when you're back online.</p>
            ) : syncStatus === 'syncing' ? (
              <p>Syncing your offline changes...</p>
            ) : pendingActions.length > 0 ? (
              <p>You have unsynchronized changes that will be synced automatically.</p>
            ) : (
              <p>All changes are synchronized and up to date.</p>
            )}
          </div>

          {/* Pending Actions */}
          {pendingActions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Pending Actions</span>
                <Badge variant="secondary" className="text-xs">
                  {pendingActions.length}
                </Badge>
              </div>

              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pendingActions.slice(0, 5).map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                  >
                    <span className="font-medium">
                      {action.type === 'equipment-update' ? 'Equipment Update' :
                       action.type === 'maintenance-log' ? 'Maintenance Log' :
                       action.type}
                    </span>
                    <span className="text-gray-500">
                      {new Date(action.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}

                {pendingActions.length > 5 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{pendingActions.length - 5} more actions
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cache Statistics */}
          {cacheStats && (
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Cached Data</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-medium text-blue-700">
                    {cacheStats.cachedEquipment}
                  </div>
                  <div className="text-blue-600">Equipment</div>
                </div>
                
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-medium text-green-700">
                    {cacheStats.cachedUsers}
                  </div>
                  <div className="text-green-600">Users</div>
                </div>
              </div>
            </div>
          )}

          {/* Sync Error */}
          {syncStatus === 'error' && (
            <div className="flex items-start space-x-2 p-2 bg-red-50 rounded border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-red-700">Sync Failed</div>
                <div className="text-red-600">
                  Unable to sync some changes. They'll be retried automatically.
                </div>
              </div>
            </div>
          )}

          {/* Offline Tips */}
          {!isOnline && (
            <div className="border-t border-gray-200 pt-3">
              <div className="text-xs text-gray-600">
                <div className="font-medium mb-1">Offline capabilities:</div>
                <ul className="space-y-0.5">
                  <li>• View cached equipment</li>
                  <li>• Update equipment status</li>
                  <li>• Add maintenance logs</li>
                  <li>• Scan QR codes</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}