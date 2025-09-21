// ABOUTME: Enhanced main dashboard page for ProfiCo Inventory Management System
// ABOUTME: Comprehensive role-based dashboard with real-time data, statistics, and personalized insights

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  FileText,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Settings,
  BarChart3,
  Calendar,
  DollarSign,
  HardDrive,
} from "lucide-react";
import Link from "next/link";
import { RequestHistory } from "@/components/requests/request-history";
import { format } from "date-fns";

interface DashboardStats {
  totalEquipment: number;
  assignedToMe: number;
  pendingRequests: number;
  myRequests: number;
  approvalsNeeded: number;
  teamMembers?: number;
  totalValue: number;
  maintenanceDue: number;
}

interface RecentActivity {
  id: string;
  type: 'equipment' | 'request' | 'user' | 'maintenance';
  action: string;
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    image?: string;
  };
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { user } = session;

  // Get role-specific dashboard data
  let stats: DashboardStats;
  let recentActivity: RecentActivity[] = [];
  let userRequests: any[] = [];
  let displayEquipment: any[] = [];

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (user.role === "admin") {
    // Admin dashboard data
    const [
      totalEquipment,
      allRequests,
      pendingRequests,
      totalValue,
      maintenanceDue,
      allUsers,
      recentEquipment,
      recentRequests,
      recentApprovals
    ] = await Promise.all([
      db.equipment.count(),
      db.equipmentRequest.count(),
      db.equipmentRequest.count({ where: { status: "pending" } }),
      db.equipment.aggregate({ _sum: { purchasePrice: true } }),
      db.equipment.count({ 
        where: { 
          nextMaintenanceDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          status: { not: "decommissioned" }
        }
      }),
      db.user.count({ where: { isActive: true } }),
      db.equipment.findMany({
        where: { updatedAt: { gte: weekAgo } },
        include: { assignedTo: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10
      }),
      db.equipmentRequest.findMany({
        where: { createdAt: { gte: weekAgo } },
        include: { requester: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      db.requestHistory.findMany({
        where: { createdAt: { gte: weekAgo } },
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);

    stats = {
      totalEquipment,
      assignedToMe: 0,
      pendingRequests,
      myRequests: 0,
      approvalsNeeded: pendingRequests,
      teamMembers: allUsers,
      totalValue: totalValue._sum.purchasePrice || 0,
      maintenanceDue,
    };

    // Build recent activity from different sources
    recentActivity = [
      ...recentEquipment.map(eq => ({
        id: eq.id,
        type: 'equipment' as const,
        action: 'updated',
        title: `${eq.name}`,
        description: `Equipment ${eq.status.replace('_', ' ')}`,
        timestamp: eq.updatedAt,
        user: eq.assignedTo ? { name: eq.assignedTo.name } : undefined
      })),
      ...recentRequests.map(req => ({
        id: req.id,
        type: 'request' as const,
        action: 'created',
        title: `Request for ${req.equipmentType}`,
        description: `Status: ${req.status}`,
        timestamp: req.createdAt,
        user: { name: req.requester.name, image: req.requester.image }
      })),
      ...recentApprovals.map(app => ({
        id: app.id,
        type: 'request' as const,
        action: app.action.includes('approved') ? 'approved' : app.action.includes('rejected') ? 'rejected' : 'updated',
        title: `Request ${app.action.replace(/_/g, ' ')}`,
        description: app.notes || 'Status updated',
        timestamp: app.createdAt,
        user: { name: app.user.name, image: app.user.image }
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);

  } else if (user.role === "team_lead") {
    // Team lead dashboard data
    const [
      teamMembersCount,
      teamEquipment,
      pendingApprovals,
      myRequests,
      recentTeamActivity
    ] = await Promise.all([
      db.user.count({ where: { teamId: user.teamId, isActive: true } }),
      db.equipment.findMany({
        where: {
          OR: [
            { assignedTo: { teamId: user.teamId } },
            { status: { in: ['available', 'pending'] } }
          ]
        },
        include: { assignedTo: { select: { name: true, email: true } } }
      }),
      db.equipmentRequest.count({
        where: { 
          status: "pending",
          teamLeadApproval: null,
          requester: { teamId: user.teamId }
        }
      }),
      db.equipmentRequest.count({
        where: { requesterId: user.id }
      }),
      db.requestHistory.findMany({
        where: {
          createdAt: { gte: weekAgo },
          OR: [
            { user: { teamId: user.teamId } },
            { requester: { teamId: user.teamId } }
          ]
        },
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);

    stats = {
      totalEquipment: teamEquipment.length,
      assignedToMe: teamEquipment.filter(eq => eq.assignedToId === user.id).length,
      pendingRequests: pendingApprovals,
      myRequests,
      approvalsNeeded: pendingApprovals,
      teamMembers: teamMembersCount,
      totalValue: teamEquipment.reduce((sum, eq) => sum + (eq.purchasePrice || 0), 0),
      maintenanceDue: teamEquipment.filter(eq => 
        eq.nextMaintenanceDate && new Date(eq.nextMaintenanceDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ).length,
    };

    displayEquipment = teamEquipment.slice(0, 10);
    recentActivity = recentTeamActivity.map(activity => ({
      id: activity.id,
      type: 'request' as const,
      action: activity.action,
      title: activity.action.replace(/_/g, ' '),
      description: activity.notes || 'Status updated',
      timestamp: activity.createdAt,
      user: { name: activity.user.name, image: activity.user.image }
    }));

  } else {
    // Regular user dashboard data
    const [
      myEquipment,
      myRequests,
      pendingRequests
    ] = await Promise.all([
      db.equipment.findMany({
        where: { assignedToId: user.id },
        include: { 
          assignedTo: { select: { name: true, email: true } },
          maintenanceRecords: {
            where: { completed: false },
            orderBy: { dueDate: "asc" },
            take: 1
          }
        },
        orderBy: { assignedAt: "desc" }
      }),
      db.equipmentRequest.findMany({
        where: { requesterId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      db.equipmentRequest.count({
        where: { 
          requesterId: user.id,
          status: "pending"
        }
      })
    ]);

    stats = {
      totalEquipment: myEquipment.length,
      assignedToMe: myEquipment.length,
      pendingRequests,
      myRequests: myRequests.length,
      approvalsNeeded: 0,
      totalValue: myEquipment.reduce((sum, eq) => sum + (eq.purchasePrice || 0), 0),
      maintenanceDue: myEquipment.filter(eq => 
        eq.nextMaintenanceDate && new Date(eq.nextMaintenanceDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ).length,
    };

    userRequests = myRequests.slice(0, 5);
    displayEquipment = myEquipment.slice(0, 10);

    // Build recent activity from user's requests and equipment
    recentActivity = [
      ...myEquipment.map(eq => ({
        id: eq.id,
        type: 'equipment' as const,
        action: 'assigned',
        title: `${eq.name}`,
        description: `Assigned to you on ${format(eq.assignedAt!, 'MMM d')}`,
        timestamp: eq.assignedAt!,
      })),
      ...myRequests.map(req => ({
        id: req.id,
        type: 'request' as const,
        action: req.status === 'pending' ? 'created' : req.status,
        title: `Request for ${req.equipmentType}`,
        description: `Status: ${req.status}`,
        timestamp: req.createdAt,
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user.name}!</h1>
          <p className="text-gray-600 mt-1">
            {user.role === "admin" && "System Administrator Dashboard"}
            {user.role === "team_lead" && "Team Lead Dashboard"}
            {user.role === "user" && "Personal Dashboard"}
          </p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="mb-2">
            {user.role.replace("_", " ").toUpperCase()}
          </Badge>
          <p className="text-sm text-gray-500">
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEquipment}</div>
            {stats.assignedToMe > 0 && (
              <p className="text-xs text-gray-500">{stats.assignedToMe} assigned to you</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myRequests}</div>
            {stats.pendingRequests > 0 && (
              <p className="text-xs text-orange-600">{stats.pendingRequests} pending</p>
            )}
          </CardContent>
        </Card>

        {(user.role === "admin" || user.role === "team_lead") && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approvalsNeeded}</div>
              <p className="text-xs text-gray-500">need your review</p>
            </CardContent>
          </Card>
        )}

        {stats.teamMembers !== undefined && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teamMembers}</div>
              <p className="text-xs text-gray-500">active members</p>
            </CardContent>
          </Card>
        )}

        {stats.totalValue > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.totalValue.toLocaleString()}</div>
              <p className="text-xs text-gray-500">equipment value</p>
            </CardContent>
          </Card>
        )}

        {stats.maintenanceDue > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.maintenanceDue}</div>
              <p className="text-xs text-gray-500">due soon</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and navigation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button asChild variant="outline" className="h-20 flex-col">
                  <Link href="/equipment">
                    <Package className="h-6 w-6 mb-2" />
                    Browse Equipment
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="h-20 flex-col">
                  <Link href="/requests/new">
                    <Plus className="h-6 w-6 mb-2" />
                    New Request
                  </Link>
                </Button>

                {user.role === "user" && (
                  <Button asChild variant="outline" className="h-20 flex-col">
                    <Link href="/requests">
                      <FileText className="h-6 w-6 mb-2" />
                      My Requests
                    </Link>
                  </Button>
                )}

                {(user.role === "admin" || user.role === "team_lead") && (
                  <>
                    <Button asChild variant="outline" className="h-20 flex-col">
                      <Link href="/requests/approve">
                        <CheckCircle className="h-6 w-6 mb-2" />
                        Approve Requests
                      </Link>
                    </Button>

                    <Button asChild variant="outline" className="h-20 flex-col">
                      <Link href="/equipment/add">
                        <Plus className="h-6 w-6 mb-2" />
                        Add Equipment
                      </Link>
                    </Button>
                  </>
                )}

                {user.role === "admin" && (
                  <>
                    <Button asChild variant="outline" className="h-20 flex-col">
                      <Link href="/admin/users">
                        <Users className="h-6 w-6 mb-2" />
                        Manage Users
                      </Link>
                    </Button>

                    <Button asChild variant="outline" className="h-20 flex-col">
                      <Link href="/admin/reports">
                        <BarChart3 className="h-6 w-6 mb-2" />
                        Reports
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Recent Activity</span>
                <Badge variant="outline">{recentActivity.length}</Badge>
              </CardTitle>
              <CardDescription>
                Latest updates from across the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                        activity.type === 'equipment' ? 'bg-blue-500' :
                        activity.type === 'request' ? 'bg-green-500' :
                        activity.type === 'user' ? 'bg-purple-500' : 'bg-orange-500'
                      }`}>
                        {activity.type === 'equipment' && <Package className="h-4 w-4" />}
                        {activity.type === 'request' && <FileText className="h-4 w-4" />}
                        {activity.type === 'user' && <Users className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          <span className="text-xs text-gray-500">
                            {format(activity.timestamp, 'MMM d, HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {recentActivity.length > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm">
                      View All Activity
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Equipment</CardTitle>
              <CardDescription>
                Equipment assigned to you or your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamEquipment.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No equipment assigned</p>
                  <p className="text-sm mt-2">Submit a request to get equipment assigned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayEquipment.map((equipment) => (
                    <div key={equipment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <HardDrive className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-medium">{equipment.name}</h4>
                          <p className="text-sm text-gray-600">
                            {equipment.serialNumber} • {equipment.status.replace('_', ' ')}
                          </p>
                          {equipment.assignedTo && (
                            <p className="text-xs text-gray-500">
                              Assigned to: {equipment.assignedTo.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={
                            equipment.status === 'assigned' ? 'default' :
                            equipment.status === 'available' ? 'secondary' :
                            equipment.status === 'maintenance' ? 'destructive' : 'outline'
                          }
                        >
                          {equipment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Requests</CardTitle>
              <CardDescription>
                Equipment requests you've submitted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No requests yet</p>
                  <p className="text-sm mt-2">Create your first equipment request</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{request.equipmentType}</h4>
                        <p className="text-sm text-gray-600">
                          Submitted {format(request.createdAt, 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {request.justification}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <Badge 
                          variant={
                            request.status === 'approved' ? 'default' :
                            request.status === 'pending' ? 'secondary' :
                            request.status === 'rejected' ? 'destructive' : 'outline'
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <RequestHistory requestId="" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
