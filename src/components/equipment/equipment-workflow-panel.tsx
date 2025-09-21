// ABOUTME: Equipment workflow panel for managing equipment lifecycle and processes
// ABOUTME: Provides comprehensive workflow management with status transitions, approvals, and tracking

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  UserPlus,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import type { Equipment } from "@prisma/client";

interface EquipmentWithOwner extends Equipment {
  currentOwner: { id: string; name: string; email: string } | null;
}

interface EquipmentWorkflowPanelProps {
  equipment: EquipmentWithOwner[];
  onEquipmentSelect?: (equipmentIds: string[]) => void;
  onMaintenanceRequest?: (equipmentId: string) => void;
  canManage: boolean;
}

interface WorkflowItem {
  id: string;
  type: 'assignment' | 'maintenance' | 'decommission' | 'transfer';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  equipmentId: string;
  equipmentName: string;
  dueDate?: Date;
  assignee?: string;
}

interface WorkflowStats {
  totalItems: number;
  pendingItems: number;
  inProgressItems: number;
  completedItems: number;
  overdueItems: number;
  highPriorityItems: number;
}

export function EquipmentWorkflowPanel({
  equipment,
  onEquipmentSelect,
  canManage,
}: EquipmentWorkflowPanelProps) {
  const [workflowItems, setWorkflowItems] = useState<WorkflowItem[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflowData();
  }, [equipment]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWorkflowData = async () => {
    try {
      // Generate workflow items based on equipment status
      const items: WorkflowItem[] = [];
      
      equipment.forEach(item => {
        // Equipment needing assignment
        if (item.status === 'available' && !item.currentOwner) {
          items.push({
            id: `assign-${item.id}`,
            type: 'assignment',
            title: 'Assign Equipment',
            description: `${item.name} is available for assignment`,
            priority: 'medium',
            status: 'pending',
            equipmentId: item.id,
            equipmentName: item.name,
          });
        }

        // Equipment needing maintenance
        if (item.status === 'broken' || item.status === 'maintenance') {
          items.push({
            id: `maintenance-${item.id}`,
            type: 'maintenance',
            title: 'Maintenance Required',
            description: `${item.name} requires maintenance attention`,
            priority: 'high',
            status: item.status === 'maintenance' ? 'in_progress' : 'pending',
            equipmentId: item.id,
            equipmentName: item.name,
          });
        }

        // Equipment pending decommission
        if (item.status === 'lost' || item.status === 'stolen') {
          items.push({
            id: `decommission-${item.id}`,
            type: 'decommission',
            title: 'Decommission Equipment',
            description: `${item.name} needs to be decommissioned`,
            priority: 'medium',
            status: 'pending',
            equipmentId: item.id,
            equipmentName: item.name,
          });
        }
      });

      setWorkflowItems(items);
      
      // Calculate stats
      const workflowStats: WorkflowStats = {
        totalItems: items.length,
        pendingItems: items.filter(item => item.status === 'pending').length,
        inProgressItems: items.filter(item => item.status === 'in_progress').length,
        completedItems: items.filter(item => item.status === 'completed').length,
        overdueItems: items.filter(item => 
          item.dueDate && new Date(item.dueDate) < new Date()
        ).length,
        highPriorityItems: items.filter(item => 
          item.priority === 'high' || item.priority === 'urgent'
        ).length,
      };
      
      setStats(workflowStats);
    } catch (error) {
      console.error('Error loading workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'in_progress': return Wrench;
      case 'completed': return CheckCircle;
      default: return Package;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assignment': return UserPlus;
      case 'maintenance': return Wrench;
      case 'decommission': return AlertTriangle;
      case 'transfer': return ArrowRight;
      default: return Package;
    }
  };

  const handleWorkflowAction = (item: WorkflowItem) => {
    if (item.type === 'maintenance' && onMaintenanceRequest) {
      onMaintenanceRequest(item.equipmentId);
    } else if (onEquipmentSelect) {
      onEquipmentSelect([item.equipmentId]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow Stats Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Workflow Overview</span>
            </CardTitle>
            <CardDescription>
              Current equipment workflow status and pending actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalItems}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingItems}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.inProgressItems}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completedItems}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.overdueItems}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.highPriorityItems}</div>
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Workflow Progress</span>
                <span>{Math.round((stats.completedItems / stats.totalItems) * 100)}%</span>
              </div>
              <Progress 
                value={(stats.completedItems / stats.totalItems) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Active Workflow Items</span>
          </CardTitle>
          <CardDescription>
            Equipment requiring attention or workflow actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({workflowItems.length})</TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({workflowItems.filter(i => i.status === 'pending').length})
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                In Progress ({workflowItems.filter(i => i.status === 'in_progress').length})
              </TabsTrigger>
              <TabsTrigger value="high_priority">
                High Priority ({workflowItems.filter(i => i.priority === 'high' || i.priority === 'urgent').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {workflowItems.length > 0 ? (
                workflowItems.map((item) => {
                  const StatusIcon = getStatusIcon(item.status);
                  const TypeIcon = getTypeIcon(item.type);
                  
                  return (
                    <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{item.title}</h4>
                              <Badge variant={getPriorityColor(item.priority)}>
                                {item.priority}
                              </Badge>
                              <Badge variant="outline">
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {item.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                            <div className="text-xs text-gray-500">
                              Equipment: {item.equipmentName}
                            </div>
                          </div>
                        </div>
                        
                        {canManage && item.status !== 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWorkflowAction(item)}
                          >
                            {item.type === 'assignment' && <UserPlus className="h-4 w-4 mr-1" />}
                            {item.type === 'maintenance' && <Wrench className="h-4 w-4 mr-1" />}
                            {item.type === 'decommission' && <AlertTriangle className="h-4 w-4 mr-1" />}
                            Action
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>No pending workflow items</p>
                  <p className="text-sm">All equipment is in good status</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-3">
              {workflowItems
                .filter(item => item.status === 'pending')
                .map((item) => {
                  const StatusIcon = getStatusIcon(item.status);
                  const TypeIcon = getTypeIcon(item.type);
                  
                  return (
                    <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{item.title}</h4>
                              <Badge variant={getPriorityColor(item.priority)}>
                                {item.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          </div>
                        </div>
                        
                        {canManage && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWorkflowAction(item)}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-3">
              {workflowItems
                .filter(item => item.status === 'in_progress')
                .map((item) => {
                  const StatusIcon = getStatusIcon(item.status);
                  const TypeIcon = getTypeIcon(item.type);
                  
                  return (
                    <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <TypeIcon className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{item.title}</h4>
                              <Badge variant="default">
                                <StatusIcon className="h-3 w-3 mr-1" />
                                In Progress
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          </div>
                        </div>
                        
                        {canManage && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWorkflowAction(item)}
                          >
                            <Wrench className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </TabsContent>

            <TabsContent value="high_priority" className="space-y-3">
              {workflowItems
                .filter(item => item.priority === 'high' || item.priority === 'urgent')
                .map((item) => {
                  const StatusIcon = getStatusIcon(item.status);
                  const TypeIcon = getTypeIcon(item.type);
                  
                  return (
                    <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors border-red-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <TypeIcon className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{item.title}</h4>
                              <Badge variant="destructive">
                                {item.priority}
                              </Badge>
                              <Badge variant="outline">
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {item.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          </div>
                        </div>
                        
                        {canManage && item.status !== 'completed' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleWorkflowAction(item)}
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Action Required
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}