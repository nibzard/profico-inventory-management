// ABOUTME: Equipment detail page showing comprehensive equipment information
// ABOUTME: Displays equipment details, history, maintenance records, and actions

import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Wrench, 
  QrCode, 
  UserPlus, 
  UserMinus,
  Calendar,
  MapPin,
  Euro,
  Package,
  FileText,
  History
} from "lucide-react";
import Link from "next/link";
import { EquipmentAssignDialog } from "@/components/equipment/equipment-assign-dialog";
import { EquipmentUnassignDialog } from "@/components/equipment/equipment-unassign-dialog";

interface EquipmentDetailPageProps {
  params: { id: string };
}

export default async function EquipmentDetailPage({ params }: EquipmentDetailPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const equipment = await db.equipment.findUnique({
    where: { id: params.id },
    include: {
      currentOwner: {
        select: { id: true, name: true, email: true, image: true },
      },
      team: {
        select: { id: true, name: true },
      },
      maintenanceRecords: {
        orderBy: { date: "desc" },
        include: {
          performedBy: {
            select: { id: true, name: true },
          },
        },
        take: 5,
      },
      history: {
        orderBy: { timestamp: "desc" },
        include: {
          performedBy: {
            select: { id: true, name: true },
          },
        },
        take: 10,
      },
    },
  });

  if (!equipment) {
    notFound();
  }

  // Check if user has permission to view this equipment
  if (session.user.role === "user" && equipment.currentOwnerId !== session.user.id && equipment.status !== "available") {
    redirect("/dashboard");
  }

  const canEdit = session.user.role === "admin" || session.user.role === "team_lead";
  const canAssign = canEdit && equipment.status === "available";
  const canUnassign = canEdit && equipment.status === "assigned";

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/equipment">
              <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{equipment.name}</h1>
              <p className="text-gray-600">
                {equipment.brand} {equipment.model}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(equipment.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Basic Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Serial Number</p>
                    <p className="font-mono text-sm">{equipment.serialNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <Badge variant="outline">
                      {equipment.category.replace("_", " ")}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Brand</p>
                    <p>{equipment.brand}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Model</p>
                    <p>{equipment.model}</p>
                  </div>
                </div>

                {equipment.description && (
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="mt-1">{equipment.description}</p>
                  </div>
                )}

                {equipment.notes && (
                  <div>
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="mt-1 text-sm">{equipment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Euro className="h-5 w-5" />
                  <span>Purchase Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Purchase Date</p>
                    <p>{new Date(equipment.purchaseDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Purchase Price</p>
                    <p>€{equipment.purchasePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Value</p>
                    <p>€{equipment.currentValue.toFixed(2)}</p>
                  </div>
                  {equipment.warrantyExpiry && (
                    <div>
                      <p className="text-sm text-gray-600">Warranty Expiry</p>
                      <p>{new Date(equipment.warrantyExpiry).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Records */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5" />
                  <span>Maintenance Records</span>
                </CardTitle>
                {canEdit && (
                  <CardDescription>
                    <Link href={`/equipment/${equipment.id}/maintenance`}>
                      <Button variant="outline" size="sm">
                        Add Maintenance Record
                      </Button>
                    </Link>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {equipment.maintenanceRecords.length > 0 ? (
                  <div className="space-y-3">
                    {equipment.maintenanceRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{record.type}</p>
                          <p className="text-sm text-gray-600">{record.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(record.date).toLocaleDateString()} • {record.performedBy.name}
                          </p>
                        </div>
                        <Badge variant={record.cost > 0 ? "default" : "outline"}>
                          €{record.cost.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                    <Link href={`/equipment/${equipment.id}/maintenance`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View All Maintenance Records
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No maintenance records found
                  </p>
                )}
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <History className="h-5 w-5" />
                  <span>Recent History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {equipment.history.map((record) => (
                    <div key={record.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={record.performedBy.image || ""} />
                        <AvatarFallback className="text-xs">
                          {record.performedBy.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{record.action}</p>
                        <p className="text-sm text-gray-600">{record.details}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Owner */}
            <Card>
              <CardHeader>
                <CardTitle>Current Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                {equipment.currentOwner ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={equipment.currentOwner.image || ""} />
                        <AvatarFallback>
                          {equipment.currentOwner.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{equipment.currentOwner.name}</p>
                        <p className="text-sm text-gray-600">{equipment.currentOwner.email}</p>
                      </div>
                    </div>
                    {canUnassign && (
                      <EquipmentUnassignDialog equipment={equipment} />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-3">Unassigned</p>
                    {canAssign && (
                      <EquipmentAssignDialog equipment={equipment} />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location */}
            {equipment.location && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Location</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{equipment.location}</p>
                </CardContent>
              </Card>
            )}

            {/* Maintenance Schedule */}
            {(equipment.lastMaintenanceDate || equipment.nextMaintenanceDate) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Maintenance Schedule</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {equipment.lastMaintenanceDate && (
                    <div>
                      <p className="text-sm text-gray-600">Last Maintenance</p>
                      <p>{new Date(equipment.lastMaintenanceDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {equipment.nextMaintenanceDate && (
                    <div>
                      <p className="text-sm text-gray-600">Next Maintenance</p>
                      <p>{new Date(equipment.nextMaintenanceDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/equipment/${equipment.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Equipment
                  </Link>
                </Button>
                
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/equipment/${equipment.id}/qr`}>
                    <QrCode className="h-4 w-4 mr-2" />
                    View QR Code
                  </Link>
                </Button>

                {canEdit && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/equipment/${equipment.id}/maintenance`}>
                      <Wrench className="h-4 w-4 mr-2" />
                      Maintenance
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}