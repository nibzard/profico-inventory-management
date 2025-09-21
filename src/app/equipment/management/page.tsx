// ABOUTME: Equipment management workflow page with comprehensive lifecycle management
// ABOUTME: Provides unified interface for status management, history tracking, and categorization

"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipmentList } from "@/components/equipment/equipment-list";
import { BulkOperations } from "@/components/equipment/bulk-operations";
import { EquipmentStatusDialog } from "@/components/equipment/equipment-status-dialog";
import { EquipmentHistoryComponent } from "@/components/equipment/equipment-history";
import { EquipmentCategoriesTags } from "@/components/equipment/equipment-categories-tags";
import { EquipmentWorkflowPanel } from "@/components/equipment/equipment-workflow-panel";
import { MaintenanceWorkflowDialog } from "@/components/equipment/maintenance-workflow-dialog";
import {
  Settings,
  Activity,
  Tag,
  BarChart3,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  Filter,
  Search,
} from "lucide-react";
import type { Equipment, User } from "@prisma/client";

interface EquipmentWithOwner extends Equipment {
  currentOwner: User | null;
}

interface WorkflowStats {
  totalEquipment: number;
  availableEquipment: number;
  assignedEquipment: number;
  maintenanceEquipment: number;
  brokenEquipment: number;
  pendingActions: number;
  recentActivity: number;
}

export default function EquipmentManagementPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [equipment, setEquipment] = useState<EquipmentWithOwner[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedEquipmentForStatus, setSelectedEquipmentForStatus] = useState<EquipmentWithOwner | null>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedEquipmentForMaintenance, setSelectedEquipmentForMaintenance] = useState<EquipmentWithOwner | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionData = await auth();
        setSession(sessionData);

        if (!sessionData) {
          router.push("/auth/signin");
          return;
        }

        // Fetch equipment
        const equipmentResponse = await fetch("/api/equipment");
        if (equipmentResponse.ok) {
          const equipmentData = await equipmentResponse.json();
          setEquipment(equipmentData);
        }

        // Fetch users for assignment
        const usersResponse = await fetch("/api/users");
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }

        // Fetch workflow stats
        const statsResponse = await fetch("/api/equipment/workflow-stats");
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleStatusChange = (equipmentItem: EquipmentWithOwner) => {
    setSelectedEquipmentForStatus(equipmentItem);
    setStatusDialogOpen(true);
  };

  const handleMaintenanceRequest = (equipmentItem: EquipmentWithOwner) => {
    setSelectedEquipmentForMaintenance(equipmentItem);
    setMaintenanceDialogOpen(true);
  };

  const refreshData = () => {
    // Refresh equipment data
    const fetchEquipment = async () => {
      const response = await fetch("/api/equipment");
      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      }
    };
    fetchEquipment();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const canEdit = session.user.role === "admin" || session.user.role === "team_lead";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Equipment Management</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive equipment lifecycle management and workflow tracking
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button asChild>
              <a href="/equipment/add">
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </a>
            </Button>
          </div>
        </div>

        {/* Statistics Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalEquipment}</p>
                    <p className="text-sm text-gray-600">Total Equipment</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.availableEquipment}</p>
                    <p className="text-sm text-gray-600">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.assignedEquipment}</p>
                    <p className="text-sm text-gray-600">Assigned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.maintenanceEquipment}</p>
                    <p className="text-sm text-gray-600">Maintenance</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.brokenEquipment}</p>
                    <p className="text-sm text-gray-600">Broken</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.recentActivity}</p>
                    <p className="text-sm text-gray-600">Recent Activity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Operations */}
        {selectedEquipment.length > 0 && (
          <BulkOperations
            selectedEquipment={selectedEquipment}
            onOperationComplete={() => {
              setSelectedEquipment([]);
              refreshData();
            }}
            users={users}
            userRole={session.user.role}
          />
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="equipment" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="equipment" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Equipment</span>
            </TabsTrigger>
            <TabsTrigger value="workflow" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Workflow</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span>Categories & Tags</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Inventory</CardTitle>
                <CardDescription>
                  Manage and monitor all equipment in the inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EquipmentList
                  equipment={equipment}
                  currentPage={1}
                  totalPages={1}
                  userRole={session.user.role}
                  userId={session.user.id}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6">
            <EquipmentWorkflowPanel
              equipment={equipment}
              onEquipmentSelect={(ids) => setSelectedEquipment(ids)}
              onMaintenanceRequest={(equipmentId) => {
                const equipmentItem = equipment.find(eq => eq.id === equipmentId);
                if (equipmentItem) {
                  handleMaintenanceRequest(equipmentItem);
                }
              }}
              canManage={canEdit}
            />
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <EquipmentCategoriesTags
              canManage={canEdit}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Equipment Distribution</CardTitle>
                  <CardDescription>
                    Overview of equipment by category and status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from(new Set(equipment.map(eq => eq.category))).map(category => {
                      const categoryEquipment = equipment.filter(eq => eq.category === category);
                      const availableCount = categoryEquipment.filter(eq => eq.status === "available").length;
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium capitalize">{category.replace("_", " ")}</p>
                            <p className="text-sm text-gray-600">{categoryEquipment.length} items</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">{availableCount} available</p>
                            <p className="text-xs text-gray-500">
                              {Math.round((availableCount / categoryEquipment.length) * 100)}% available
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assignment Efficiency</CardTitle>
                  <CardDescription>
                    Equipment utilization and assignment metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Utilization Rate</p>
                        <p className="text-sm text-gray-600">Equipment currently in use</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {stats ? Math.round((stats.assignedEquipment / stats.totalEquipment) * 100) : 0}%
                        </p>
                        <p className="text-sm text-gray-500">
                          {stats?.assignedEquipment} of {stats?.totalEquipment}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Availability Rate</p>
                        <p className="text-sm text-gray-600">Equipment ready for assignment</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {stats ? Math.round((stats.availableEquipment / stats.totalEquipment) * 100) : 0}%
                        </p>
                        <p className="text-sm text-gray-500">
                          {stats?.availableEquipment} of {stats?.totalEquipment}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Maintenance Rate</p>
                        <p className="text-sm text-gray-600">Equipment under maintenance</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {stats ? Math.round((stats.maintenanceEquipment / stats.totalEquipment) * 100) : 0}%
                        </p>
                        <p className="text-sm text-gray-500">
                          {stats?.maintenanceEquipment} of {stats?.totalEquipment}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Status Management Dialog */}
        {selectedEquipmentForStatus && (
          <EquipmentStatusDialog
            equipment={selectedEquipmentForStatus}
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            onSuccess={refreshData}
          />
        )}

        {/* Maintenance Workflow Dialog */}
        {selectedEquipmentForMaintenance && (
          <MaintenanceWorkflowDialog
            equipment={selectedEquipmentForMaintenance}
            open={maintenanceDialogOpen}
            onOpenChange={setMaintenanceDialogOpen}
            onSuccess={refreshData}
            currentUser={session.user}
          />
        )}
      </div>
    </div>
  );
}