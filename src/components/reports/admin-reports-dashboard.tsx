// ABOUTME: Comprehensive admin reports dashboard component with analytics and insights
// ABOUTME: Provides equipment utilization, user activity, and compliance reporting with export capabilities

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  TrendingDown,
  TrendingUp,
  Package,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Percent,
  FileText,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ReportData {
  totalEquipment: number;
  availableEquipment: number;
  assignedEquipment: number;
  maintenanceEquipment: number;
  brokenEquipment: number;
  decommissionedEquipment: number;
  totalValue: number;
  equipmentByCategory: Record<string, number>;
  equipmentByStatus: Record<string, number>;
  valueByCategory: Record<string, {
    totalValue: number;
    count: number;
    averageValue: number;
  }>;
  maintenanceByStatus: Record<string, number>;
  requestsByStatus: Record<string, number>;
  depreciationAnalysis: {
    byAge: Array<{
      ageRange: string;
      depreciationRate: number;
      count: number;
      originalValue: number;
      currentValue: number;
    }>;
    summary: {
      totalEquipment: number;
      totalOriginalValue: number;
      totalCurrentValue: number;
      averageDepreciationRate: number;
    };
  };
  depreciationByCategory: Array<{
    category: string;
    totalEquipment: number;
    totalValue: number;
    depreciatedEquipment: number;
    depreciatedValue: number;
    depreciationPercentage: number;
    valueDepreciationPercentage: number;
  }>;
  teamStats?: {
    id: string;
    name: string;
    userCount: number;
    assignedEquipmentCount: number;
  } | null;
  subscriptionStats?: {
    activeSubscriptions: number;
    monthlyCost: number;
    annualCost: number;
  } | null;
  recentEquipment: Array<{
    id: string;
    name: string;
    serialNumber: string;
    status: string;
    purchaseDate: string | null;
    purchasePrice: number | null;
    category: string;
  }>;
  generatedAt: string;
  filters: Record<string, unknown>;
}

interface Team {
  id: string;
  name: string;
}

export function AdminReportsDashboard() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filter states
  const [reportType, setReportType] = useState("inventory");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const categories = ["computers", "mobile_devices", "peripherals", "office_equipment", "networking"];
  const statuses = ["pending", "available", "assigned", "maintenance", "broken", "decommissioned"];

  useEffect(() => {
    fetchTeams();
    fetchReportData();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams");
      if (response.ok) {
        const teamsData = await response.json();
        setTeams(teamsData);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (reportType) params.append("type", reportType);
      if (category && category !== "all") params.append("category", category);
      if (status) params.append("status", status);
      if (teamFilter) params.append("team", teamFilter);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const response = await fetch(`/api/reports?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        toast.error("Failed to fetch report data");
      }
    } catch (error) {
      console.error("Failed to fetch report data:", error);
      toast.error("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      setExporting(true);
      
      const body = {
        format,
        type: reportType,
        category,
        status,
        team: teamFilter,
        dateFrom,
        dateTo,
      };

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        if (format === "csv") {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          toast.success("Report exported successfully");
        } else {
          const data = await response.json();
          console.log("Export data:", data);
          toast.success("Report data generated");
        }
      } else {
        toast.error("Failed to export report");
      }
    } catch (error) {
      console.error("Failed to export report:", error);
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "broken":
        return "bg-red-100 text-red-800";
      case "decommissioned":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Chart data transformations
  const statusChartData = reportData ? Object.entries(reportData.equipmentByStatus).map(([status, count]) => ({
    name: status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    percentage: reportData.totalEquipment > 0 ? ((count / reportData.totalEquipment) * 100).toFixed(1) : "0"
  })) : [];

  const categoryChartData = reportData ? Object.entries(reportData.equipmentByCategory).map(([category, count]) => ({
    name: category.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    totalValue: reportData.valueByCategory[category]?.totalValue || 0,
  })) : [];

  const depreciationChartData = reportData ? reportData.depreciationAnalysis.byAge.map(ageGroup => ({
    name: ageGroup.ageRange,
    equipment: ageGroup.count,
    originalValue: ageGroup.originalValue,
    currentValue: ageGroup.currentValue,
    depreciationRate: ageGroup.depreciationRate * 100,
  })) : [];

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const STATUS_COLORS = {
    'Available': '#10B981',
    'Assigned': '#3B82F6', 
    'Maintenance': '#F59E0B',
    'Broken': '#EF4444',
    'Decommissioned': '#6B7280',
    'Pending': '#8B5CF6'
  } as Record<string, string>;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Failed to load report data</p>
        <Button onClick={fetchReportData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const utilizationRate = reportData && reportData.totalEquipment > 0 
    ? (reportData.assignedEquipment / reportData.totalEquipment) * 100 
    : 0;

  const maintenanceRate = reportData && reportData.totalEquipment > 0 
    ? ((reportData.maintenanceEquipment + reportData.brokenEquipment) / reportData.totalEquipment) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Admin Reports</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive analytics and insights for inventory management
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleExport("csv")}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchReportData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Report Filters
          </CardTitle>
          <CardDescription>
            Customize your report by applying filters and selecting specific criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="value">Value Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  {statuses.map((stat) => (
                    <SelectItem key={stat} value={stat}>
                      {stat.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="team">Team</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={fetchReportData}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Total Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.totalEquipment || 0}</div>
            <p className="text-xs text-gray-500">
              {reportData?.availableEquipment || 0} available, {reportData?.assignedEquipment || 0} assigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Utilization Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilizationRate.toFixed(1)}%</div>
            <Progress value={utilizationRate} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">Equipment in active use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData?.totalValue || 0)}</div>
            <p className="text-xs text-gray-500">
              Current: {formatCurrency(reportData?.depreciationAnalysis.summary.totalCurrentValue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Maintenance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{maintenanceRate.toFixed(1)}%</div>
            <Progress value={maintenanceRate} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {(reportData?.maintenanceEquipment || 0) + (reportData?.brokenEquipment || 0)} items need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Equipment by Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Equipment by Status</CardTitle>
                <CardDescription>Current distribution of equipment across different statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {statusChartData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: STATUS_COLORS[item.name] || COLORS[index % COLORS.length] }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value} items ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Equipment by Category Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Equipment by Category</CardTitle>
                <CardDescription>Distribution of equipment across different categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'value' ? `${value} items` : formatCurrency(value as number),
                          name === 'value' ? 'Equipment Count' : 'Total Value'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="value" name="Equipment Count" fill="#3B82F6" />
                      <Bar dataKey="totalValue" name="Total Value" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Request Statistics */}
          {reportData && Object.keys(reportData.requestsByStatus).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Request Activity</CardTitle>
                <CardDescription>Current status of equipment requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(reportData.requestsByStatus).map(([status, count]) => (
                    <div key={status} className="text-center">
                      <div className="text-2xl font-bold">{count}</div>
                      <p className="text-sm text-gray-600 capitalize">
                        {status.replace("_", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          {/* Recent Equipment */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Equipment</CardTitle>
              <CardDescription>
                Latest equipment added to the inventory ({reportData.recentEquipment.length} items)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.recentEquipment.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-mono text-sm">{item.serialNumber}</TableCell>
                        <TableCell>
                          {item.category.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(item.status)}>
                            {item.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.purchaseDate ? format(new Date(item.purchaseDate), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.purchasePrice ? formatCurrency(item.purchasePrice) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {reportData.recentEquipment.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-500">No equipment data available</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciation" className="space-y-4">
          {/* Depreciation Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Original Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(reportData.depreciationAnalysis.summary.totalOriginalValue)}
                </div>
                <p className="text-xs text-gray-500">Initial purchase value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Current Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData.depreciationAnalysis.summary.totalCurrentValue)}
                </div>
                <p className="text-xs text-gray-500">After depreciation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Percent className="h-4 w-4 mr-2" />
                  Depreciation Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {(reportData.depreciationAnalysis.summary.averageDepreciationRate * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500">Average across all equipment</p>
              </CardContent>
            </Card>
          </div>

          {/* Depreciation by Age */}
          <Card>
            <CardHeader>
              <CardTitle>Depreciation by Age</CardTitle>
              <CardDescription>Equipment value depreciation based on age groups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Depreciation Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={depreciationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'equipment' ? `${value} items` : formatCurrency(value as number),
                          name === 'equipment' ? 'Equipment Count' : 
                          name === 'originalValue' ? 'Original Value' : 'Current Value'
                        ]}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="originalValue" 
                        stackId="1" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        name="Original Value"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="currentValue" 
                        stackId="2" 
                        stroke="#82ca9d" 
                        fill="#82ca9d" 
                        name="Current Value"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Depreciation Rate Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={depreciationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`, 'Depreciation Rate']} />
                      <Legend />
                      <Bar dataKey="depreciationRate" name="Depreciation Rate %" fill="#FF8042" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="mt-6 space-y-4">
                {reportData.depreciationAnalysis.byAge.map((ageGroup, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{ageGroup.ageRange}</h4>
                      <Badge variant="outline">
                        {(ageGroup.depreciationRate * 100).toFixed(0)}% depreciated
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Equipment Count</p>
                        <p className="font-medium">{ageGroup.count}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Original Value</p>
                        <p className="font-medium">{formatCurrency(ageGroup.originalValue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Current Value</p>
                        <p className="font-medium">{formatCurrency(ageGroup.currentValue)}</p>
                      </div>
                    </div>
                    <Progress 
                      value={(1 - ageGroup.depreciationRate) * 100} 
                      className="mt-2" 
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Depreciation by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Depreciation by Category</CardTitle>
              <CardDescription>Equipment depreciation breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total Equipment</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead className="text-right">Depreciated Items</TableHead>
                      <TableHead className="text-right">Depreciation %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.depreciationByCategory.map((category) => (
                      <TableRow key={category.category}>
                        <TableCell className="font-medium">
                          {category.category.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </TableCell>
                        <TableCell className="text-right">{category.totalEquipment}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(category.totalValue)}
                        </TableCell>
                        <TableCell className="text-right">{category.depreciatedEquipment}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {category.depreciationPercentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {/* Team Statistics */}
          {reportData.teamStats && (
            <Card>
              <CardHeader>
                <CardTitle>Team Statistics</CardTitle>
                <CardDescription>Statistics for {reportData.teamStats.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{reportData.teamStats.userCount}</div>
                    <p className="text-sm text-gray-600">Team Members</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{reportData.teamStats.assignedEquipmentCount}</div>
                    <p className="text-sm text-gray-600">Assigned Equipment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Maintenance Activity */}
          {Object.keys(reportData.maintenanceByStatus).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Activity</CardTitle>
                <CardDescription>Current maintenance request status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(reportData.maintenanceByStatus).map(([status, count]) => (
                    <div key={status} className="text-center">
                      <div className="text-2xl font-bold">{count}</div>
                      <p className="text-sm text-gray-600 capitalize">
                        {status.replace("_", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Statistics */}
          {reportData.subscriptionStats && (
            <Card>
              <CardHeader>
                <CardTitle>Subscription Overview</CardTitle>
                <CardDescription>Software subscription costs and analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{reportData.subscriptionStats.activeSubscriptions}</div>
                    <p className="text-sm text-gray-600">Active Subscriptions</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(reportData.subscriptionStats.monthlyCost)}
                    </div>
                    <p className="text-sm text-gray-600">Monthly Cost</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(reportData.subscriptionStats.annualCost)}
                    </div>
                    <p className="text-sm text-gray-600">Annual Cost</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
              <CardDescription>Equipment compliance and audit readiness</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Equipment Documentation</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Complete</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">Depreciation Tracking</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Audit Trail</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Available</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>Generate compliance reports for external use</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleExport("csv")}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  disabled
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF Report (Coming Soon)
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  disabled
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Excel Report (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Report generated: {format(new Date(reportData.generatedAt), "PPpp")}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Type: {reportType}</span>
              {Object.keys(reportData.filters).length > 0 && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Filters applied: {Object.keys(reportData.filters).length}</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                <Activity className="h-3 w-3 mr-1" />
                Live Data
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}