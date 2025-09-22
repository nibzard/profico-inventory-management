// ABOUTME: Equipment detail page showing comprehensive equipment information
// ABOUTME: Displays equipment details, history, maintenance records, and actions

import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { ensureDevelopmentUser } from "@/lib/dev-auth";
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
import { EquipmentStatusDialogWrapper } from "@/components/equipment/equipment-status-dialog-wrapper";
import { EquipmentAssignmentDialogs } from "@/components/equipment/equipment-assignment-dialogs";
import { EquipmentHistoryComponent } from "@/components/equipment/equipment-history";
import { EquipmentCategoriesTags } from "@/components/equipment/equipment-categories-tags";
import { EquipmentPhotos } from "@/components/equipment/equipment-photos";

interface EquipmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EquipmentDetailPage({ params }: EquipmentDetailPageProps) {
  // Ensure development user exists in development mode
  await ensureDevelopmentUser(db);
  
  const session = await auth();
  
  // Since middleware handles authentication, we should always have a session here
  // If we somehow don't have one, redirect to signin
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const { id } = await params;
  const { user } = session;

  // Fetch equipment data
  let equipment;
  try {
    equipment = await db.equipment.findUnique({
      where: { id },
      include: {
        currentOwner: {
          select: { id: true, name: true, email: true, image: true },
        },
        maintenanceRecords: {
          orderBy: { date: "desc" },
          take: 3,
        },
        history: {
          include: {
            fromUser: {
              select: { id: true, name: true, image: true },
            },
            toUser: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    } catch (error) {
    console.error("Error fetching equipment:", error);
    throw error;
  }

  if (!equipment) {
    notFound();
  }

  // Check if user has permission to view this equipment
  // Regular users can only view:
  // 1. Equipment assigned to them
  // 2. Available equipment (to request)
  // Admins and team leads can view all equipment
  const isOwner = equipment.currentOwnerId === user.id;
  const isAvailable = equipment.status === "available";
  const isAdminOrLead = user.role === "admin" || user.role === "team_lead";
  
  if (user.role === "user" && !isOwner && !isAvailable) {
    redirect("/dashboard");
  }

  const canEdit = user.role === "admin" || user.role === "team_lead";
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

            {/* Equipment Photos */}
            <EquipmentPhotos
              equipmentId={equipment.id}
              equipmentName={equipment.name}
              canUpload={canEdit}
              canDelete={canEdit}
            />

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
                            {new Date(record.date).toLocaleDateString()} • {record.performedBy || "Unknown"}
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
                  {equipment.history.map((record) => {
                    const user = record.fromUser || record.toUser;
                    return (
                      <div key={record.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.image || ""} />
                          <AvatarFallback className="text-xs">
                            {user?.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{record.action}</p>
                          <p className="text-sm text-gray-600">{record.notes}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(record.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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
                      <EquipmentAssignmentDialogs equipment={equipment} canAssign={false} canUnassign={true} />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-3">Unassigned</p>
                    {canAssign && (
                      <EquipmentAssignmentDialogs equipment={equipment} canAssign={true} canUnassign={false} />
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
                
                <EquipmentStatusDialogWrapper equipment={equipment} canEdit={canEdit} />
                
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
                      Maintenance Records
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Equipment History Section */}
      <div className="mt-8">
        <EquipmentHistoryComponent
          equipmentId={equipment.id}
          equipmentName={equipment.name}
          canAddManualEntries={canEdit}
        />
      </div>

      {/* Equipment Categories and Tags */}
      <div className="mt-8">
        <EquipmentCategoriesTags
          equipmentId={equipment.id}
          canManage={canEdit}
        />
      </div>
    </div>
  );
}