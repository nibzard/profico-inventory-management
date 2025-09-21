// ABOUTME: Offline fallback page shown when users have no internet connection
// ABOUTME: Provides information about offline capabilities and cached data access

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
import {
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle,
  AlertCircle,
  Clock,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';

interface OfflineAction {
  id: number;
  type: string;
  data: any;
  timestamp: number;
}

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get offline actions from service worker
    getOfflineActionsFromSW();

    // Listen for service worker messages
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, []);

  const handleSWMessage = (event: MessageEvent) => {
    if (event.data?.type === 'SYNC_SUCCESS') {
      setLastSyncTime(new Date());
      getOfflineActionsFromSW(); // Refresh the list
    }
  };

  const getOfflineActionsFromSW = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data?.actions) {
          setOfflineActions(event.data.actions);
        }
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_OFFLINE_ACTIONS' },
        [messageChannel.port2]
      );
    }
  };

  const retryConnection = () => {
    window.location.reload();
  };

  const formatActionType = (type: string) => {
    switch (type) {
      case 'equipment-update':
        return 'Equipment Update';
      case 'maintenance-log':
        return 'Maintenance Log';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'equipment-update':
        return <Database className="h-4 w-4" />;
      case 'maintenance-log':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${isOnline ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isOnline ? (
                <CheckCircle className="h-12 w-12 text-green-600" />
              ) : (
                <WifiOff className="h-12 w-12 text-gray-600" />
              )}
            </div>
          </div>
          
          <div>
            <h1 className="text-3xl font-bold">
              {isOnline ? 'Back Online!' : 'You\'re Offline'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isOnline 
                ? 'Your connection has been restored. Syncing any pending changes...'
                : 'No internet connection detected. You can still access cached data and queue actions for later.'
              }
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <Button onClick={retryConnection} variant={isOnline ? 'default' : 'outline'}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {isOnline ? 'Continue' : 'Retry Connection'}
            </Button>
            
            <Button variant="outline" asChild>
              <Link href="/equipment">
                <Database className="h-4 w-4 mr-2" />
                View Cached Equipment
              </Link>
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Offline Capabilities
            </CardTitle>
            <CardDescription>
              What you can do while offline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-green-600">✓ Available Offline:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• View cached equipment list</li>
                  <li>• View equipment details</li>
                  <li>• Scan QR codes</li>
                  <li>• Update equipment status</li>
                  <li>• Add maintenance logs</li>
                  <li>• Take equipment photos</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-orange-600">⚠ Requires Internet:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Create new equipment</li>
                  <li>• Generate reports</li>
                  <li>• Send email notifications</li>
                  <li>• Upload files to cloud</li>
                  <li>• Real-time collaboration</li>
                  <li>• Advanced search</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        {offlineActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Pending Actions
                </span>
                <Badge variant="secondary">
                  {offlineActions.length} queued
                </Badge>
              </CardTitle>
              <CardDescription>
                These actions will be synced automatically when you're back online
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {offlineActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getActionIcon(action.type)}
                      <div>
                        <div className="font-medium text-sm">
                          {formatActionType(action.type)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(action.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant="outline" className="text-xs">
                      Queued
                    </Badge>
                  </div>
                ))}
              </div>

              {lastSyncTime && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Last sync: {lastSyncTime.toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you can perform offline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
                <Link href="/equipment">
                  <Database className="h-6 w-6" />
                  <span className="text-xs">Equipment List</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
                <Link href="/equipment/search">
                  <Database className="h-6 w-6" />
                  <span className="text-xs">Search Equipment</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
                <Link href="/dashboard">
                  <Smartphone className="h-6 w-6" />
                  <span className="text-xs">Dashboard</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
                <Link href="/equipment/scanner">
                  <WifiOff className="h-6 w-6" />
                  <span className="text-xs">QR Scanner</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}