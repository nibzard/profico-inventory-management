// ABOUTME: Equipment maintenance page for managing maintenance records
// ABOUTME: Interface for adding, viewing, and managing equipment maintenance

import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Plus, 
  Wrench, 
  Calendar, 
  Euro,
  User,
  FileText,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { MaintenanceFormDialog } from "@/components/forms/maintenance-form-dialog";

interface MaintenancePageProps {
  params: { id: string };
}

export default async function MaintenancePage({ params }: MaintenancePageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "admin" && session.user.role !== "team_lead") {
    redirect("/dashboard");
  }

  const equipment = await db.equipment.findUnique({
    where: { id: params.id },
    include: {
      currentOwner: {
        select: { id: true, name: true, email: true },
      },
      maintenanceRecords: {
        orderBy: { date: "desc" },
        include: {
          performedBy: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
  });

  if (!equipment) {
    notFound();
  }

  const needsMaintenance = equipment.nextMaintenanceDate && 
    new Date(equipment.nextMaintenanceDate) <= new Date();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={`/equipment/${equipment.id}`}>
              <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Maintenance</h1>
              <p className="text-gray-600">
                Manage maintenance for {equipment.name}
              </p>
            </div>
          </div>
          <MaintenanceFormDialog equipment={equipment} />
        </div>

        {/* Equipment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wrench className="h-5 w-5" />
              <span>Equipment Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Equipment</p>
                <p className="font-medium">{equipment.name}</p>
                <p className="text-sm text-gray-500">{equipment.brand} {equipment.model}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Current Status</p>
                <Badge variant={equipment.status === "maintenance" ? "destructive" : "default"}>
                  {equipment.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-gray-600">Next Maintenance</p>
                {equipment.nextMaintenanceDate ? (
                  <div className="flex items-center space-x-2">
                    <p className={needsMaintenance ? "text-red-600 font-medium" : ""}>
                      {new Date(equipment.nextMaintenanceDate).toLocaleDateString()}
                    </p>
                    {needsMaintenance && (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Not scheduled</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Maintenance Schedule</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Last Maintenance</p>
                {equipment.lastMaintenanceDate ? (
                  <p className="font-medium">
                    {new Date(equipment.lastMaintenanceDate).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-gray-500">No previous maintenance</p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-600">Next Maintenance</p>
                {equipment.nextMaintenanceDate ? (
                  <p className={needsMaintenance ? "text-red-600 font-medium" : "font-medium"}>
                    {new Date(equipment.nextMaintenanceDate).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-gray-500">Not scheduled</p>
                )}
              </div>

              {needsMaintenance && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm font-medium text-red-800">
                      Maintenance Overdue
                    </p>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    This equipment is scheduled for maintenance but no record has been added.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{equipment.maintenanceRecords.length}</p>
                  <p className="text-sm text-gray-600">Total Records</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    €{equipment.maintenanceRecords.reduce((sum, record) => sum + record.cost, 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Total Cost</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Most Recent</p>
                {equipment.maintenanceRecords.length > 0 ? (
                  <div className="flex items-center space-x-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={equipment.maintenanceRecords[0].performedBy.image || ""} />
                      <AvatarFallback className="text-xs">
                        {equipment.maintenanceRecords[0].performedBy.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {equipment.maintenanceRecords[0].performedBy.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(equipment.maintenanceRecords[0].date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No maintenance records</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Maintenance Records */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Maintenance Records</span>
              </CardTitle>
              <MaintenanceFormDialog equipment={equipment} />
            </div>
            <CardDescription>
              Complete history of maintenance activities for this equipment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {equipment.maintenanceRecords.length > 0 ? (
              <div className="space-y-4">
                {equipment.maintenanceRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge variant="outline">{record.type}</Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(record.date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <h4 className="font-medium mb-2">{record.description}</h4>
                        
                        {record.notes && (
                          <p className="text-sm text-gray-600 mb-3">{record.notes}</p>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{record.performedBy.name}</span>
                          </div>
                          
                          {record.cost > 0 && (
                            <div className="flex items-center space-x-2">
                              <Euro className="h-4 w-4" />
                              <span>€{record.cost.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {record.cost > 0 && (
                        <Badge variant="secondary">
                          €{record.cost.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Maintenance Records
                </h3>
                <p className="text-gray-500 mb-4">
                  Start tracking maintenance for this equipment by adding your first record.
                </p>
                <MaintenanceFormDialog equipment={equipment} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}