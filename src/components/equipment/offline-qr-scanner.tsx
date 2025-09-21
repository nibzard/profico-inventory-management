// ABOUTME: Enhanced QR scanner component with offline capabilities and mobile optimization
// ABOUTME: Works with cached equipment data and provides instant results even offline

'use client';

import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  QrCode,
  Scan,
  X,
  WifiOff,
  Search,
  Package,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useOfflineData } from '@/hooks/use-offline-data';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface QRScanResult {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  category: string;
  currentOwner?: {
    id: string;
    name: string;
    email: string;
  };
  lastCached?: number;
}

interface OfflineQRScannerProps {
  onScan?: (result: QRScanResult) => void;
  trigger?: React.ReactNode;
  showResults?: boolean;
}

export default function OfflineQRScanner({ 
  onScan, 
  trigger,
  showResults = true 
}: OfflineQRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const { isOnline, getCachedEquipment } = useOfflineData();

  // Clean up video stream when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const findEquipmentById = async (scannedId: string): Promise<QRScanResult | null> => {
    try {
      // First try to find in cached data
      const cachedEquipment = await getCachedEquipment();
      const cached = cachedEquipment.find(eq => 
        eq.id === scannedId || 
        eq.serialNumber === scannedId ||
        eq.qrCode === scannedId
      );

      if (cached) {
        return {
          id: cached.id,
          name: cached.name,
          serialNumber: cached.serialNumber,
          status: cached.status,
          category: cached.category,
          currentOwner: cached.currentOwner,
          lastCached: cached.lastCached,
        };
      }

      // If not found in cache and we're online, try API
      if (isOnline) {
        try {
          const response = await fetch(`/api/equipment/${scannedId}`);
          if (response.ok) {
            const equipment = await response.json();
            return {
              id: equipment.id,
              name: equipment.name,
              serialNumber: equipment.serialNumber,
              status: equipment.status,
              category: equipment.category,
              currentOwner: equipment.currentOwner,
            };
          }
        } catch (error) {
          console.error('API fetch failed:', error);
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding equipment:', error);
      return null;
    }
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setScanning(true);
      setError(null);
      setScanResult(null);
      
      // Wait for the video element to be rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!videoRef.current) {
        setError('Failed to access camera');
        setIsScanning(false);
        setScanning(false);
        return;
      }
      
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, error) => {
          if (result) {
            const scannedText = result.getText();
            setLastScanTime(new Date());
            
            // Look up equipment
            const equipment = await findEquipmentById(scannedText);
            
            if (equipment) {
              setScanResult(equipment);
              setScanning(false);
              
              if (onScan) {
                onScan(equipment);
              }
              
              if (!isOnline && equipment.lastCached) {
                toast.success('Equipment found in offline cache');
              } else {
                toast.success('Equipment found');
              }
            } else {
              setError(`Equipment not found: ${scannedText}`);
              if (!isOnline) {
                toast.error('Equipment not found in offline cache');
              } else {
                toast.error('Equipment not found');
              }
            }
            
            stopScanning();
          }
          
          if (error && !(error instanceof Error && error.name === 'NotFoundException')) {
            console.error('Scan error:', error);
          }
        }
      );
    } catch (error) {
      console.error('Error starting scanner:', error);
      setError('Failed to start camera. Please check permissions.');
      setIsScanning(false);
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setIsScanning(false);
    setScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    setIsOpen(false);
    setScanResult(null);
    setError(null);
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            Scan QR Code
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md w-full mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <QrCode className="h-5 w-5 mr-2" />
              QR Code Scanner
            </span>
            {!isOnline && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View */}
          {!scanResult && !error && (
            <div className="relative">
              <div className="aspect-square bg-black rounded-lg overflow-hidden relative">
                {isScanning && (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                )}
                
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">Camera ready</p>
                    </div>
                  </div>
                )}

                {/* Scanning overlay */}
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-white rounded-lg w-48 h-48 relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-400"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-400"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-400"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-400"></div>
                      
                      <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-blue-400 animate-pulse"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-3 text-center">
                <p className="text-sm text-gray-600">
                  {scanning ? 'Scanning for QR codes...' : 'Position QR code within the frame'}
                </p>
                {!isOnline && (
                  <p className="text-xs text-orange-600 mt-1">
                    Offline mode: Only cached equipment can be found
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && showResults && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Equipment Found
                  </CardTitle>
                  {scanResult.lastCached && (
                    <Badge variant="outline" className="text-xs">
                      Cached
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-medium">{scanResult.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{scanResult.serialNumber}</p>
                </div>

                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(scanResult.status)}`}
                  >
                    {scanResult.status.charAt(0).toUpperCase() + scanResult.status.slice(1)}
                  </Badge>
                  <span className="text-sm text-gray-500">{scanResult.category}</span>
                </div>

                {scanResult.currentOwner && (
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      Assigned to {scanResult.currentOwner.name}
                    </span>
                  </div>
                )}

                {scanResult.lastCached && (
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      Cached: {new Date(scanResult.lastCached).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex space-x-2 pt-3">
                  <Button asChild className="flex-1">
                    <Link href={`/equipment/${scanResult.id}`}>
                      <Package className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setScanResult(null);
                      startScanning();
                    }}
                  >
                    <Scan className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-800">Scan Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    startScanning();
                  }}
                  className="mt-3 w-full"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Control Buttons */}
          <div className="flex space-x-2">
            {!isScanning && !scanResult && !error && (
              <Button onClick={startScanning} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Start Scanning
              </Button>
            )}
            
            {isScanning && (
              <Button variant="outline" onClick={stopScanning} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Stop Scanning
              </Button>
            )}
            
            <Button variant="outline" onClick={handleClose}>
              {scanResult ? 'Done' : 'Cancel'}
            </Button>
          </div>

          {/* Offline Info */}
          {!isOnline && (
            <div className="text-xs text-gray-500 bg-orange-50 p-3 rounded-lg">
              <div className="flex items-start space-x-2">
                <WifiOff className="h-3 w-3 mt-0.5 text-orange-500" />
                <div>
                  <p className="font-medium text-orange-700">Offline Mode</p>
                  <p>Only equipment in your offline cache can be found. Connect to the internet for full search capabilities.</p>
                </div>
              </div>
            </div>
          )}

          {/* Scan Statistics */}
          {lastScanTime && (
            <div className="text-xs text-gray-500 text-center">
              Last scan: {lastScanTime.toLocaleTimeString()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}