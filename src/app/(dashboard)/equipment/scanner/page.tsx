// ABOUTME: Dedicated QR scanner page optimized for mobile use with offline capabilities
// ABOUTME: Full-screen scanning experience for field workers

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OfflineQRScanner from '@/components/equipment/offline-qr-scanner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  QrCode,
  ArrowLeft,
  WifiOff,
  Camera,
  Package,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

export default async function EquipmentScannerPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/equipment">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Equipment
            </Link>
          </Button>
          
          <h1 className="text-lg font-semibold">QR Scanner</h1>
          
          <div className="w-16"></div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Scanner Section */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center">
              <QrCode className="h-6 w-6 mr-2" />
              Equipment Scanner
            </CardTitle>
            <CardDescription>
              Scan QR codes to quickly find and manage equipment
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Main Scanner */}
            <div className="flex justify-center">
              <OfflineQRScanner
                trigger={
                  <Button size="lg" className="h-16 w-full text-lg">
                    <Camera className="h-6 w-6 mr-3" />
                    Start Scanning
                  </Button>
                }
                showResults={true}
              />
            </div>

            {/* Scanner Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Zap className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-medium text-green-800">Instant Results</h3>
                <p className="text-xs text-green-700 mt-1">
                  Get equipment details immediately after scanning
                </p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <WifiOff className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-medium text-blue-800">Offline Ready</h3>
                <p className="text-xs text-blue-700 mt-1">
                  Works with cached equipment data when offline
                </p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Package className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-medium text-purple-800">Quick Actions</h3>
                <p className="text-xs text-purple-700 mt-1">
                  Update status and add maintenance logs instantly
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h3 className="font-medium">Start the Scanner</h3>
                  <p className="text-sm text-gray-600">
                    Tap the "Start Scanning" button to open your camera
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h3 className="font-medium">Position QR Code</h3>
                  <p className="text-sm text-gray-600">
                    Align the QR code within the scanning frame
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h3 className="font-medium">View Results</h3>
                  <p className="text-sm text-gray-600">
                    Get instant equipment details and available actions
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Offline Information */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center text-orange-800">
              <WifiOff className="h-5 w-5 mr-2" />
              Offline Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <span className="font-medium text-green-800">Available Offline:</span>
                  <p className="text-gray-700">
                    Scan and find equipment that's been cached on your device
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <span className="font-medium text-green-800">Update Status:</span>
                  <p className="text-gray-700">
                    Change equipment status - updates will sync when online
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                <div>
                  <span className="font-medium text-orange-800">Requires Internet:</span>
                  <p className="text-gray-700">
                    Finding new equipment not in cache, creating new records
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              Common tasks after scanning equipment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" asChild className="h-16 flex-col space-y-2">
                <Link href="/equipment">
                  <Package className="h-6 w-6" />
                  <span className="text-sm">Equipment List</span>
                </Link>
              </Button>

              <Button variant="outline" asChild className="h-16 flex-col space-y-2">
                <Link href="/equipment/search">
                  <QrCode className="h-6 w-6" />
                  <span className="text-sm">Advanced Search</span>
                </Link>
              </Button>

              {(user.role === 'admin' || user.role === 'team_lead') && (
                <>
                  <Button variant="outline" asChild className="h-16 flex-col space-y-2">
                    <Link href="/equipment/add">
                      <Package className="h-6 w-6" />
                      <span className="text-sm">Add Equipment</span>
                    </Link>
                  </Button>

                  <Button variant="outline" asChild className="h-16 flex-col space-y-2">
                    <Link href="/equipment/management">
                      <Package className="h-6 w-6" />
                      <span className="text-sm">Bulk Operations</span>
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scanning Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Ensure good lighting for better scan accuracy</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Hold steady and keep the QR code in focus</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Clean the camera lens if scans are failing</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Try different distances if the code won't scan</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}