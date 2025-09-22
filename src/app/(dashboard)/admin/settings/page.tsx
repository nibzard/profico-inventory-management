// ABOUTME: Admin settings page for system configuration and management
// ABOUTME: Provides comprehensive system administration interface for ProfiCo Inventory Management

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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Settings,
  Database,
  Bell,
  Users,
  Package,
  Shield,
  Info,
  Save,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Server,
  Mail,
  Key,
  Globe,
  HardDrive,
  Clock,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

interface SystemSettings {
  companyName: string;
  companyEmail: string;
  companyWebsite: string;
  defaultDepreciationPeriod: number;
  minMaintenanceInterval: number;
  enableEmailNotifications: boolean;
  enableQRCodeGeneration: boolean;
  enableOfflineMode: boolean;
  enablePWA: boolean;
  defaultUserRole: "user" | "team_lead";
  enableUserRegistration: boolean;
  maxFileUploadSize: number;
  backupRetentionDays: number;
}

interface EquipmentCategory {
  id: string;
  name: string;
  description: string;
  defaultDepreciationPeriod: number;
  requiresMaintenanceSchedule: boolean;
}

interface SystemInfo {
  version: string;
  databaseSize: string;
  totalUsers: number;
  totalEquipment: number;
  totalRequests: number;
  uptime: string;
  lastBackup: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: "ProfiCo",
    companyEmail: "info@profico.com",
    companyWebsite: "https://profico.com",
    defaultDepreciationPeriod: 24,
    minMaintenanceInterval: 90,
    enableEmailNotifications: true,
    enableQRCodeGeneration: true,
    enableOfflineMode: true,
    enablePWA: true,
    defaultUserRole: "user",
    enableUserRegistration: false,
    maxFileUploadSize: 10,
    backupRetentionDays: 30,
  });

  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<EquipmentCategory>>({});
  const [editingCategory, setEditingCategory] = useState<EquipmentCategory | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionData = await auth();
        setSession(sessionData);

        if (!sessionData) {
          router.push("/auth/signin");
          return;
        }

        // Check admin permissions
        if (sessionData.user.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        // Fetch system settings (in a real app, this would come from the API)
        // For now, we'll use default values

        // Fetch equipment categories
        const categoriesData = [
          {
            id: "1",
            name: "Laptop",
            description: "Portable computers and laptops",
            defaultDepreciationPeriod: 36,
            requiresMaintenanceSchedule: true,
          },
          {
            id: "2",
            name: "Desktop",
            description: "Desktop computers and workstations",
            defaultDepreciationPeriod: 48,
            requiresMaintenanceSchedule: true,
          },
          {
            id: "3",
            name: "Monitor",
            description: "Computer monitors and displays",
            defaultDepreciationPeriod: 60,
            requiresMaintenanceSchedule: false,
          },
          {
            id: "4",
            name: "Phone",
            description: "Mobile phones and smartphones",
            defaultDepreciationPeriod: 24,
            requiresMaintenanceSchedule: false,
          },
        ];
        setCategories(categoriesData);

        // Fetch system info
        const infoData = {
          version: "1.0.0",
          databaseSize: "2.4 GB",
          totalUsers: 45,
          totalEquipment: 128,
          totalRequests: 89,
          uptime: "15 days, 3 hours",
          lastBackup: "2024-01-20 02:00:00",
        };
        setSystemInfo(infoData);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load settings data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // In a real app, this would call an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const category: EquipmentCategory = {
        id: Date.now().toString(),
        name: newCategory.name,
        description: newCategory.description,
        defaultDepreciationPeriod: newCategory.defaultDepreciationPeriod || 24,
        requiresMaintenanceSchedule: newCategory.requiresMaintenanceSchedule || false,
      };

      setCategories([...categories, category]);
      setNewCategory({});
      setShowCategoryDialog(false);
      toast.success("Category added successfully");
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;

    try {
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id ? editingCategory : cat
      ));
      setEditingCategory(null);
      setShowCategoryDialog(false);
      toast.success("Category updated successfully");
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      setCategories(categories.filter(cat => cat.id !== categoryId));
      toast.success("Category deleted successfully");
    } catch (error) {
      toast.error("Failed to delete category");
    }
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

  if (session.user.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access system settings. Contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Settings</h1>
            <p className="text-gray-600 mt-2">
              Configure and manage system-wide settings and preferences
            </p>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* System Information */}
        {systemInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>System Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Version</p>
                  <p className="font-medium">{systemInfo.version}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Database Size</p>
                  <p className="font-medium">{systemInfo.databaseSize}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="font-medium">{systemInfo.totalUsers}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Total Equipment</p>
                  <p className="font-medium">{systemInfo.totalEquipment}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="font-medium">{systemInfo.uptime}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Last Backup</p>
                  <p className="font-medium">{systemInfo.lastBackup}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Equipment</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center space-x-2">
              <Server className="h-4 w-4" />
              <span>System</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Basic company information displayed throughout the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={settings.companyName}
                      onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-email">Company Email</Label>
                    <Input
                      id="company-email"
                      type="email"
                      value={settings.companyEmail}
                      onChange={(e) => setSettings({...settings, companyEmail: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-website">Company Website</Label>
                  <Input
                    id="company-website"
                    type="url"
                    value={settings.companyWebsite}
                    onChange={(e) => setSettings({...settings, companyWebsite: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Default Settings</CardTitle>
                <CardDescription>
                  System-wide default values and configurations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="depreciation-period">Default Depreciation Period (months)</Label>
                    <Input
                      id="depreciation-period"
                      type="number"
                      value={settings.defaultDepreciationPeriod}
                      onChange={(e) => setSettings({...settings, defaultDepreciationPeriod: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-interval">Min Maintenance Interval (days)</Label>
                    <Input
                      id="maintenance-interval"
                      type="number"
                      value={settings.minMaintenanceInterval}
                      onChange={(e) => setSettings({...settings, minMaintenanceInterval: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management Settings</CardTitle>
                <CardDescription>
                  Configure user registration and default permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="user-registration">Enable User Registration</Label>
                    <p className="text-sm text-gray-600">Allow new users to register accounts</p>
                  </div>
                  <Switch
                    id="user-registration"
                    checked={settings.enableUserRegistration}
                    onCheckedChange={(checked) => setSettings({...settings, enableUserRegistration: checked})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default-role">Default User Role</Label>
                  <Select 
                    value={settings.defaultUserRole} 
                    onValueChange={(value: "user" | "team_lead") => setSettings({...settings, defaultUserRole: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="team_lead">Team Lead</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600">Default role assigned to new users</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Equipment Categories</CardTitle>
                    <CardDescription>
                      Manage equipment categories and their default settings
                    </CardDescription>
                  </div>
                  <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { setNewCategory({}); setEditingCategory(null); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingCategory ? "Edit Category" : "Add New Category"}
                        </DialogTitle>
                        <DialogDescription>
                          {editingCategory ? "Update category information" : "Create a new equipment category"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="category-name">Category Name</Label>
                          <Input
                            id="category-name"
                            value={editingCategory?.name || newCategory.name || ""}
                            onChange={(e) => {
                              if (editingCategory) {
                                setEditingCategory({...editingCategory, name: e.target.value});
                              } else {
                                setNewCategory({...newCategory, name: e.target.value});
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category-description">Description</Label>
                          <Textarea
                            id="category-description"
                            value={editingCategory?.description || newCategory.description || ""}
                            onChange={(e) => {
                              if (editingCategory) {
                                setEditingCategory({...editingCategory, description: e.target.value});
                              } else {
                                setNewCategory({...newCategory, description: e.target.value});
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category-depreciation">Default Depreciation Period (months)</Label>
                          <Input
                            id="category-depreciation"
                            type="number"
                            value={editingCategory?.defaultDepreciationPeriod || newCategory.defaultDepreciationPeriod || 24}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (editingCategory) {
                                setEditingCategory({...editingCategory, defaultDepreciationPeriod: value});
                              } else {
                                setNewCategory({...newCategory, defaultDepreciationPeriod: value});
                              }
                            }}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="category-maintenance"
                            checked={editingCategory?.requiresMaintenanceSchedule || newCategory.requiresMaintenanceSchedule || false}
                            onCheckedChange={(checked) => {
                              if (editingCategory) {
                                setEditingCategory({...editingCategory, requiresMaintenanceSchedule: checked});
                              } else {
                                setNewCategory({...newCategory, requiresMaintenanceSchedule: checked});
                              }
                            }}
                          />
                          <Label htmlFor="category-maintenance">Requires Maintenance Schedule</Label>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={editingCategory ? handleEditCategory : handleAddCategory}>
                            {editingCategory ? "Update" : "Add"} Category
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{category.name}</h4>
                        <p className="text-sm text-gray-600">{category.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Depreciation: {category.defaultDepreciationPeriod} months</span>
                          {category.requiresMaintenanceSchedule && (
                            <Badge variant="secondary" className="text-xs">
                              Maintenance Required
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingCategory(category);
                            setShowCategoryDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure email notifications and alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-gray-600">Send email notifications for important events</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={settings.enableEmailNotifications}
                    onCheckedChange={(checked) => setSettings({...settings, enableEmailNotifications: checked})}
                  />
                </div>

                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Email notifications will be sent for equipment requests, approvals, maintenance schedules, and system alerts.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Features</CardTitle>
                <CardDescription>
                  Enable or disable system-wide features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="qr-generation">QR Code Generation</Label>
                    <p className="text-sm text-gray-600">Enable QR code generation for equipment tracking</p>
                  </div>
                  <Switch
                    id="qr-generation"
                    checked={settings.enableQRCodeGeneration}
                    onCheckedChange={(checked) => setSettings({...settings, enableQRCodeGeneration: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="offline-mode">Offline Mode</Label>
                    <p className="text-sm text-gray-600">Enable offline functionality for mobile devices</p>
                  </div>
                  <Switch
                    id="offline-mode"
                    checked={settings.enableOfflineMode}
                    onCheckedChange={(checked) => setSettings({...settings, enableOfflineMode: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pwa">Progressive Web App</Label>
                    <p className="text-sm text-gray-600">Enable PWA features for mobile installation</p>
                  </div>
                  <Switch
                    id="pwa"
                    checked={settings.enablePWA}
                    onCheckedChange={(checked) => setSettings({...settings, enablePWA: checked})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>File and Storage Settings</CardTitle>
                <CardDescription>
                  Configure file upload and storage options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-upload">Max File Upload Size (MB)</Label>
                    <Input
                      id="max-upload"
                      type="number"
                      value={settings.maxFileUploadSize}
                      onChange={(e) => setSettings({...settings, maxFileUploadSize: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backup-retention">Backup Retention (days)</Label>
                    <Input
                      id="backup-retention"
                      type="number"
                      value={settings.backupRetentionDays}
                      onChange={(e) => setSettings({...settings, backupRetentionDays: parseInt(e.target.value)})}
                    />
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