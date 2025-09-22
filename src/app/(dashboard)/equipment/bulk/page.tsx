// ABOUTME: Equipment bulk operations page for comprehensive equipment management
// ABOUTME: Provides dedicated interface for bulk equipment operations, import/export, and mass operations

"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BulkOperations } from "@/components/equipment/bulk-operations";
import { EquipmentList } from "@/components/equipment/equipment-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Upload,
  Download,
  Settings,
  FileSpreadsheet,
  Search,
  Filter,
  Users,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Info,
  Database,
  BarChart3,
  History,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Equipment, User } from "@prisma/client";

interface EquipmentWithOwner extends Equipment {
  currentOwner: User | null;
}

interface BulkStats {
  totalEquipment: number;
  selectedEquipment: number;
  availableForAssignment: number;
  needingMaintenance: number;
  pendingOperations: number;
}

export default function EquipmentBulkPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [equipment, setEquipment] = useState<EquipmentWithOwner[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<EquipmentWithOwner[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BulkStats | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionData = await auth();
        setSession(sessionData);

        if (!sessionData) {
          router.push("/auth/signin");
          return;
        }

        // Check permissions
        if (sessionData.user.role !== "admin" && sessionData.user.role !== "team_lead") {
          router.push("/dashboard");
          return;
        }

        // Fetch equipment
        const equipmentResponse = await fetch("/api/equipment");
        if (equipmentResponse.ok) {
          const equipmentData = await equipmentResponse.json();
          setEquipment(equipmentData);
          setFilteredEquipment(equipmentData);
        }

        // Fetch users for assignment
        const usersResponse = await fetch("/api/users");
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load equipment data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Update stats when equipment or selection changes
  useEffect(() => {
    if (equipment.length > 0) {
      const availableForAssignment = equipment.filter(eq => eq.status === "available").length;
      const needingMaintenance = equipment.filter(eq => eq.status === "maintenance" || eq.status === "broken").length;
      
      setStats({
        totalEquipment: equipment.length,
        selectedEquipment: selectedEquipment.length,
        availableForAssignment,
        needingMaintenance,
        pendingOperations: 0, // This would come from a real API in production
      });
    }
  }, [equipment, selectedEquipment]);

  // Apply filters
  useEffect(() => {
    let filtered = equipment;

    if (searchQuery) {
      filtered = filtered.filter(eq =>
        eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.model.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(eq => eq.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(eq => eq.category === categoryFilter);
    }

    if (assignmentFilter !== "all") {
      if (assignmentFilter === "assigned") {
        filtered = filtered.filter(eq => eq.currentOwner !== null);
      } else if (assignmentFilter === "unassigned") {
        filtered = filtered.filter(eq => eq.currentOwner === null);
      }
    }

    setFilteredEquipment(filtered);
  }, [equipment, searchQuery, statusFilter, categoryFilter, assignmentFilter]);

  const handleSelectAll = () => {
    if (selectedEquipment.length === filteredEquipment.length) {
      setSelectedEquipment([]);
    } else {
      setSelectedEquipment(filteredEquipment.map(eq => eq.id));
    }
  };

  const handleSelectionChange = (equipmentIds: string[]) => {
    setSelectedEquipment(equipmentIds);
  };

  const refreshData = async () => {
    try {
      const response = await fetch("/api/equipment");
      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  const categories = Array.from(new Set(equipment.map(eq => eq.category)));
  const statusOptions = [
    { value: "available", label: "Available" },
    { value: "assigned", label: "Assigned" },
    { value: "maintenance", label: "Maintenance" },
    { value: "broken", label: "Broken" },
    { value: "decommissioned", label: "Decommissioned" },
  ];

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

  const canPerformBulkOperations = session.user.role === "admin" || session.user.role === "team_lead";

  if (!canPerformBulkOperations) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access bulk operations. Contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Equipment Bulk Operations</h1>
            <p className="text-gray-600 mt-2">
              Perform bulk operations on equipment inventory
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button asChild>
              <a href="/equipment/add">
                <Package className="h-4 w-4 mr-2" />
                Add Equipment
              </a>
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-blue-500" />
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
                    <p className="text-2xl font-bold">{stats.selectedEquipment}</p>
                    <p className="text-sm text-gray-600">Selected</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.availableForAssignment}</p>
                    <p className="text-sm text-gray-600">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Wrench className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.needingMaintenance}</p>
                    <p className="text-sm text-gray-600">Needs Attention</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{Math.round((filteredEquipment.length / equipment.length) * 100)}%</p>
                    <p className="text-sm text-gray-600">Filter Match</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Operations Toolbar */}
        <BulkOperations
          selectedEquipment={selectedEquipment}
          onOperationComplete={() => {
            setSelectedEquipment([]);
            refreshData();
          }}
          users={users}
          userRole={session.user.role}
        />

        {/* Main Content */}
        <Tabs defaultValue="equipment" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="equipment" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Equipment List</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Import Data</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                </CardTitle>
                <CardDescription>
                  Filter equipment to select specific items for bulk operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search equipment..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.replace("_", " ").toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Assignment</Label>
                    <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All assignments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Equipment</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedEquipment.length === filteredEquipment.length && filteredEquipment.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all" className="text-sm">
                        Select All ({filteredEquipment.length})
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equipment List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Equipment Inventory</CardTitle>
                    <CardDescription>
                      Showing {filteredEquipment.length} of {equipment.length} equipment items
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {selectedEquipment.length} selected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <EquipmentList
                  equipment={filteredEquipment}
                  currentPage={1}
                  totalPages={1}
                  userRole={session.user.role}
                  userId={session.user.id}
                  selectedItems={selectedEquipment}
                  onSelectionChange={handleSelectionChange}
                  showBulkActions={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Import Equipment Data</span>
                </CardTitle>
                <CardDescription>
                  Import equipment data from CSV files for bulk addition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Use the bulk operations toolbar above to access the import functionality.
                      You can download a CSV template to ensure proper formatting.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Import Process</h3>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                        <li>Download the CSV template using the bulk operations toolbar</li>
                        <li>Fill in your equipment data following the template format</li>
                        <li>Select "Import CSV" from the bulk operations toolbar</li>
                        <li>Upload your completed CSV file</li>
                        <li>Review and confirm the import</li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Required Fields</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                        <li>Name (Equipment name)</li>
                        <li>Serial Number (Unique identifier)</li>
                        <li>Category (Equipment category)</li>
                        <li>Brand (Manufacturer brand)</li>
                        <li>Model (Equipment model)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Export Equipment Data</span>
                </CardTitle>
                <CardDescription>
                  Export equipment data to Excel files for analysis and reporting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Select equipment items from the Equipment List tab, then use the bulk operations toolbar
                      to export the selected items to an Excel file.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Export Options</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                        <li>Export selected equipment items</li>
                        <li>Export all equipment (select all first)</li>
                        <li>Export filtered results</li>
                        <li>Download CSV template for imports</li>
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Export Data Includes</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                        <li>Basic equipment information</li>
                        <li>Current assignment details</li>
                        <li>Status and condition</li>
                        <li>Purchase and depreciation data</li>
                        <li>Maintenance history summary</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}