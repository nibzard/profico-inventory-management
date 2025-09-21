// ABOUTME: Mobile-optimized equipment page with offline capabilities and touch-friendly interface
// ABOUTME: Enhanced mobile experience for field workers with offline data support

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/prisma';
import OfflineEquipmentList from '@/components/equipment/offline-equipment-list';
import OfflineQRScanner from '@/components/equipment/offline-qr-scanner';
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
  Search,
  QrCode,
  Plus,
  Download,
  WifiOff,
  Package,
  Users,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface SearchParams {
  search?: string;
  category?: string;
  status?: string;
  owner?: string;
}

export default async function MobileEquipmentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const { user } = session;

  // Build filters for database query
  const filters: Record<string, unknown> = {};

  if (searchParams.search) {
    filters.OR = [
      { name: { contains: searchParams.search, mode: 'insensitive' } },
      { serialNumber: { contains: searchParams.search, mode: 'insensitive' } },
      { brand: { contains: searchParams.search, mode: 'insensitive' } },
      { model: { contains: searchParams.search, mode: 'insensitive' } },
    ];
  }

  if (searchParams.category) {
    filters.category = searchParams.category;
  }

  if (searchParams.status) {
    filters.status = searchParams.status;
  }

  if (searchParams.owner) {
    filters.currentOwnerId = searchParams.owner;
  }

  // For regular users, only show their own equipment or available equipment
  if (user.role === 'user') {
    filters.OR = [{ currentOwnerId: user.id }, { status: 'available' }];
  }

  // Fetch equipment and summary data
  const [equipment, equipmentStats, categories] = await Promise.all([
    db.equipment.findMany({
      where: filters,
      include: {
        currentOwner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50, // Limit for mobile performance
    }),
    db.equipment.groupBy({
      by: ['status'],
      where: user.role === 'user' 
        ? { OR: [{ currentOwnerId: user.id }, { status: 'available' }] }
        : {},
      _count: { status: true },
    }),
    db.equipment.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    }),
  ]);

  // Process stats for display
  const stats = equipmentStats.reduce((acc, stat) => {
    acc[stat.status] = stat._count.status;
    return acc;
  }, {} as Record<string, number>);

  const totalEquipment = Object.values(stats).reduce((sum, count) => sum + count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">Equipment</h1>
              <p className="text-sm text-gray-600">
                {user.role === 'user' 
                  ? 'Your equipment and available items'
                  : 'Manage all equipment'
                }
              </p>
            </div>
            
            <Badge variant="outline" className="text-xs">
              {totalEquipment} items
            </Badge>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex space-x-2 overflow-x-auto">
            <OfflineQRScanner
              trigger={
                <Button variant="outline" size="sm" className="whitespace-nowrap">
                  <QrCode className="h-4 w-4 mr-1" />
                  Scan
                </Button>
              }
            />
            
            <Button variant="outline" size="sm" asChild className="whitespace-nowrap">
              <Link href="/equipment/search">
                <Search className="h-4 w-4 mr-1" />
                Search
              </Link>
            </Button>

            {(user.role === 'admin' || user.role === 'team_lead') && (
              <>
                <Button variant="outline" size="sm" asChild className="whitespace-nowrap">
                  <Link href="/equipment/add">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Link>
                </Button>
                
                <Button variant="outline" size="sm" className="whitespace-nowrap">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Status Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-green-700">
                {stats.available || 0}
              </div>
              <div className="text-xs text-green-600">Available</div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-blue-700">
                {stats.assigned || 0}
              </div>
              <div className="text-xs text-blue-600">Assigned</div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-orange-700">
                {stats.maintenance || 0}
              </div>
              <div className="text-xs text-orange-600">Maintenance</div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-red-700">
                {stats.broken || 0}
              </div>
              <div className="text-xs text-red-600">Broken</div>
            </CardContent>
          </Card>
        </div>

        {/* Offline-Enhanced Equipment List */}
        <OfflineEquipmentList
          fallbackEquipment={equipment.map(item => ({
            id: item.id,
            name: item.name,
            serialNumber: item.serialNumber,
            status: item.status,
            category: item.category,
            brand: item.brand,
            model: item.model,
            currentOwner: item.currentOwner,
            lastCached: Date.now(),
          }))}
          userRole={user.role}
          userId={user.id}
        />

        {/* Mobile-Specific Quick Actions */}
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
                <Link href="/equipment/search">
                  <Search className="h-5 w-5" />
                  <span className="text-xs">Advanced Search</span>
                </Link>
              </Button>

              <Button variant="outline" asChild className="h-16 flex-col space-y-1">
                <Link href="/dashboard">
                  <Package className="h-5 w-5" />
                  <span className="text-xs">Dashboard</span>
                </Link>
              </Button>

              <Button variant="outline" asChild className="h-16 flex-col space-y-1">
                <Link href="/equipment/requests">
                  <Users className="h-5 w-5" />
                  <span className="text-xs">My Requests</span>
                </Link>
              </Button>

              {(user.role === 'admin' || user.role === 'team_lead') && (
                <>
                  <Button variant="outline" asChild className="h-16 flex-col space-y-1">
                    <Link href="/equipment/maintenance">
                      <Wrench className="h-5 w-5" />
                      <span className="text-xs">Maintenance</span>
                    </Link>
                  </Button>

                  <Button variant="outline" asChild className="h-16 flex-col space-y-1">
                    <Link href="/equipment/management">
                      <Package className="h-5 w-5" />
                      <span className="text-xs">Bulk Operations</span>
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mobile Offline Guide */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center text-blue-800">
              <WifiOff className="h-5 w-5 mr-2" />
              Mobile & Offline Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <span className="font-medium text-green-800">Offline Viewing:</span>
                  <p className="text-gray-700">View cached equipment even without internet</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <span className="font-medium text-green-800">QR Scanning:</span>
                  <p className="text-gray-700">Scan QR codes to find equipment instantly</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <span className="font-medium text-green-800">Status Updates:</span>
                  <p className="text-gray-700">Update equipment status - syncs when online</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <span className="font-medium text-blue-800">Touch Optimized:</span>
                  <p className="text-gray-700">Designed for mobile devices and touch interaction</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium">Tip for Field Workers:</p>
                  <p>Install this app on your home screen for quick access. Changes made offline will automatically sync when you're back online.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories Quick Filter (Mobile Horizontal Scroll) */}
        {categories.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Filter by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                <Button variant="outline" size="sm" asChild className="whitespace-nowrap">
                  <Link href="/equipment/mobile">All</Link>
                </Button>
                {categories.map((cat) => (
                  <Button 
                    key={cat.category} 
                    variant="outline" 
                    size="sm" 
                    asChild 
                    className="whitespace-nowrap"
                  >
                    <Link href={`/equipment/mobile?category=${encodeURIComponent(cat.category)}`}>
                      {cat.category}
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}