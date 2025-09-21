// ABOUTME: Mobile-optimized dashboard component with PWA features and offline capabilities
// ABOUTME: Touch-friendly interface designed for field workers and mobile use

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
  Package,
  QrCode,
  Search,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  WifiOff,
  Smartphone,
  TrendingUp,
  Users,
  Wrench,
  Download,
} from 'lucide-react';
import { useOfflineData } from '@/hooks/use-offline-data';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface EquipmentStats {
  total: number;
  available: number;
  assigned: number;
  maintenance: number;
  broken: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  user?: User;
  equipment?: {
    id: string;
    name: string;
  };
}

interface MobileDashboardProps {
  user: User;
  equipmentStats: EquipmentStats;
  recentActivity: RecentActivity[];
  myEquipment: Array<{
    id: string;
    name: string;
    status: string;
    category: string;
  }>;
}

export default function MobileDashboard({
  user,
  equipmentStats,
  recentActivity,
  myEquipment,
}: MobileDashboardProps) {
  const { isOnline, pendingActions, getCacheStats } = useOfflineData();
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if PWA is installed
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

    // Load cache statistics
    const loadCacheStats = async () => {
      const stats = await getCacheStats();
      setCacheStats(stats);
    };

    loadCacheStats();
  }, [getCacheStats]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600';
      case 'assigned':
        return 'text-blue-600';
      case 'maintenance':
        return 'text-orange-600';
      case 'broken':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatActivityTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-4">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 border-2 border-white">
              <AvatarImage src={`/avatars/${user.id}.jpg`} />
              <AvatarFallback className="bg-white text-blue-600">
                {user.name?.charAt(0) || user.email.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                {getGreeting()}, {user.name || user.email.split('@')[0]}!
              </h2>
              <p className="text-blue-100 text-sm">
                {user.role === 'admin' ? 'Administrator' : 
                 user.role === 'team_lead' ? 'Team Leader' : 'User'}
              </p>
            </div>

            <div className="text-right">
              {!isOnline && (
                <Badge variant="secondary" className="bg-orange-500 text-white text-xs">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
              
              {isInstalled && (
                <Badge variant="secondary" className="bg-green-500 text-white text-xs mt-1">
                  <Smartphone className="h-3 w-3 mr-1" />
                  Installed
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Equipment Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {equipmentStats.available}
              </div>
              <div className="text-xs text-green-700">Available</div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {equipmentStats.assigned}
              </div>
              <div className="text-xs text-blue-700">Assigned</div>
            </div>
            
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {equipmentStats.maintenance}
              </div>
              <div className="text-xs text-orange-700">Maintenance</div>
            </div>
            
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {equipmentStats.broken}
              </div>
              <div className="text-xs text-red-700">Broken</div>
            </div>
          </div>

          {/* Pending Actions */}
          {pendingActions.length > 0 && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">
                    {pendingActions.length} pending sync
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Offline
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks for mobile users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" asChild className="h-16 flex-col space-y-1">
              <Link href="/equipment/scanner">
                <QrCode className="h-5 w-5" />
                <span className="text-xs">QR Scanner</span>
              </Link>
            </Button>

            <Button variant="outline" asChild className="h-16 flex-col space-y-1">
              <Link href="/equipment">
                <Package className="h-5 w-5" />
                <span className="text-xs">Equipment List</span>
              </Link>
            </Button>

            <Button variant="outline" asChild className="h-16 flex-col space-y-1">
              <Link href="/equipment/search">
                <Search className="h-5 w-5" />
                <span className="text-xs">Search</span>
              </Link>
            </Button>

            {(user.role === 'admin' || user.role === 'team_lead') && (
              <Button variant="outline" asChild className="h-16 flex-col space-y-1">
                <Link href="/equipment/add">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Add Equipment</span>
                </Link>
              </Button>
            )}

            <Button variant="outline" asChild className="h-16 flex-col space-y-1">
              <Link href="/equipment/requests">
                <Users className="h-5 w-5" />
                <span className="text-xs">Requests</span>
              </Link>
            </Button>

            {(user.role === 'admin' || user.role === 'team_lead') && (
              <Button variant="outline" asChild className="h-16 flex-col space-y-1">
                <Link href="/reports">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-xs">Reports</span>
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Equipment */}
      {myEquipment.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                My Equipment
              </span>
              <Badge variant="secondary" className="text-xs">
                {myEquipment.length} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myEquipment.slice(0, 3).map((equipment) => (
                <div
                  key={equipment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{equipment.name}</p>
                    <p className="text-xs text-gray-500">{equipment.category}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(equipment.status)}`}></div>
                    <span className="text-xs capitalize">{equipment.status}</span>
                  </div>
                </div>
              ))}
              
              {myEquipment.length > 3 && (
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/equipment?owner=me">
                    View All My Equipment
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.slice(0, 4).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {activity.type === 'equipment_update' && <Package className="h-4 w-4 text-blue-600" />}
                  {activity.type === 'maintenance' && <Wrench className="h-4 w-4 text-blue-600" />}
                  {activity.type === 'request' && <Users className="h-4 w-4 text-blue-600" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activity.description}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatActivityTime(activity.timestamp)}
                    </span>
                    {activity.equipment && (
                      <span className="text-xs text-blue-600">
                        {activity.equipment.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {recentActivity.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Offline Status & Cache Info */}
      {cacheStats && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center text-blue-800">
              <Smartphone className="h-5 w-5 mr-2" />
              Mobile & Offline Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center p-2 bg-blue-100 rounded">
                <div className="font-medium text-blue-700">{cacheStats.cachedEquipment}</div>
                <div className="text-blue-600 text-xs">Cached Equipment</div>
              </div>
              <div className="text-center p-2 bg-blue-100 rounded">
                <div className="font-medium text-blue-700">{pendingActions.length}</div>
                <div className="text-blue-600 text-xs">Pending Sync</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-orange-600" />
                )}
                <span className="text-sm font-medium">
                  {isOnline ? 'Online' : 'Offline Mode'}
                </span>
              </div>

              {isInstalled && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  App Installed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}