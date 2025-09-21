'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
import QRCodeGenerator from '@/components/qr-code-generator';
import QRScanner from '@/components/qr-scanner';
import { 
  ArrowLeft, 
  QrCode, 
  Scan, 
  Download, 
  Share,
  Eye,
  User,
  Package,
  Calendar,
  MapPin,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import type { Equipment } from '@prisma/client';
import { getEquipmentForQR } from '@/lib/actions/equipment-qr';

interface EquipmentWithOwner extends Equipment {
  currentOwner: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
  } | null;
}

interface EquipmentQRPageProps {
  equipment: EquipmentWithOwner;
  userRole: string;
}

export default function EquipmentQRPage() {
  const params = useParams();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<EquipmentWithOwner | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const result = await getEquipmentForQR(params.id as string);
        setEquipment(result.equipment);
        setUserRole(result.userRole);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load equipment');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [params.id]);

  const handleScan = (result: string) => {
    setScanResult(result);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      available: "default",
      assigned: "secondary",
      maintenance: "destructive",
      broken: "destructive",
      decommissioned: "outline",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const qrValue = equipment ? `${window.location.origin}/equipment/${equipment.id}` : '';

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading equipment...</p>
        </div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">{error || 'Equipment not found'}</p>
          <Button asChild>
            <Link href="/equipment">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Equipment
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button asChild variant="outline">
            <Link href={`/equipment/${equipment.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Equipment
            </Link>
          </Button>
          
          <div className="flex items-center space-x-2">
            <QRScanner 
              onScan={handleScan}
              trigger={
                <Button variant="outline">
                  <Scan className="h-4 w-4 mr-2" />
                  Scan Equipment
                </Button>
              }
            />
          </div>
        </div>
        
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Equipment QR Code</h1>
          <p className="text-muted-foreground">
            Generate and manage QR code for {equipment.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="h-5 w-5 mr-2" />
                QR Code
              </CardTitle>
              <CardDescription>
                Scan this QR code to quickly access equipment information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <QRCodeGenerator
                  value={qrValue}
                  title={equipment.name}
                  description={`QR code for ${equipment.name} (${equipment.serialNumber})`}
                  size={250}
                />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Usage Instructions:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Print this QR code and attach to equipment</li>
                  <li>• Scan to view equipment details instantly</li>
                  <li>• Use for inventory verification</li>
                  <li>• Quick equipment status updates</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Equipment Information */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Equipment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{equipment.name}</h3>
                  <p className="text-muted-foreground">
                    {equipment.brand} {equipment.model}
                  </p>
                  <p className="text-sm font-mono text-muted-foreground mt-1">
                    Serial: {equipment.serialNumber}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {getStatusBadge(equipment.status)}
                  <Badge variant="outline">
                    {equipment.category.replace("_", " ")}
                  </Badge>
                </div>

                {equipment.currentOwner ? (
                  <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={equipment.currentOwner.image || ""} />
                      <AvatarFallback>
                        {equipment.currentOwner.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">Assigned to</p>
                      <p className="text-sm text-muted-foreground">
                        {equipment.currentOwner.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Unassigned</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Purchase Date</p>
                      <p className="text-sm">
                        {new Date(equipment.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Purchase Price</p>
                      <p className="text-sm">€{equipment.purchasePrice?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>

                {equipment.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm">{equipment.location}</p>
                    </div>
                  </div>
                )}

                {equipment.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{equipment.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Scan Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Scanned URL:</strong> {scanResult}
              </p>
              <Button asChild size="sm">
                <Link href={scanResult}>
                  <Eye className="h-4 w-4 mr-2" />
                  Open Scanned Equipment
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}