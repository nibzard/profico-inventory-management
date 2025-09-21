// ABOUTME: Billing dashboard component for subscription management
// ABOUTME: Provides comprehensive billing analytics, cost tracking, and invoice management

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  AlertTriangle,
  Download,
  Upload,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Subscription } from "@prisma/client";

interface SubscriptionWithUser extends Subscription {
  assignedUser: {
    id: string;
    name: string;
    email: string;
  };
}

interface BillingStats {
  totalMonthlyCost: number;
  totalYearlyCost: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  upcomingRenewals: number;
  personalCardCosts: number;
  reimbursementPending: number;
}

interface Invoice {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  vendor: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  invoiceUrl?: string;
  createdAt: string;
}

interface BillingDashboardProps {
  subscriptions: SubscriptionWithUser[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function BillingDashboard({ subscriptions }: BillingDashboardProps) {
  const [timeRange, setTimeRange] = useState<string>("30");
  const [stats, setStats] = useState<BillingStats | null>(null);
  // const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [costTrendData, setCostTrendData] = useState<Array<{date: string; cost: number; subscriptions: number}>>([]);
  const [vendorBreakdown, setVendorBreakdown] = useState<Array<{vendor: string; cost: number; count: number}>>([]);

  useEffect(() => {
    calculateStats();
    generateCostTrendData();
    generateVendorBreakdown();
  }, [subscriptions, timeRange]);

  const calculateStats = () => {
    const now = new Date();
    
    const activeSubscriptions = subscriptions.filter(s => s.isActive);
    const expiredSubscriptions = subscriptions.filter(s => s.renewalDate < now);
    const upcomingRenewals = subscriptions.filter(s => {
      const renewalDate = new Date(s.renewalDate);
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilRenewal > 0 && daysUntilRenewal <= 30;
    });

    const monthlySubscriptions = activeSubscriptions.filter(s => s.billingFrequency === "monthly");
    const yearlySubscriptions = activeSubscriptions.filter(s => s.billingFrequency === "yearly");

    const totalMonthlyCost = monthlySubscriptions.reduce((sum, s) => sum + s.price, 0);
    const totalYearlyCost = yearlySubscriptions.reduce((sum, s) => sum + s.price, 0);
    
    const personalCardSubscriptions = activeSubscriptions.filter(s => s.paymentMethod === "personal_card");
    const personalCardCosts = personalCardSubscriptions.reduce((sum, s) => {
      const monthlyCost = s.billingFrequency === "monthly" ? s.price : s.price / 12;
      return sum + monthlyCost;
    }, 0);

    const reimbursementPending = personalCardSubscriptions
      .filter(s => s.isReimbursement)
      .reduce((sum, s) => {
        const monthlyCost = s.billingFrequency === "monthly" ? s.price : s.price / 12;
        return sum + monthlyCost;
      }, 0);

    setStats({
      totalMonthlyCost,
      totalYearlyCost,
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      expiredSubscriptions: expiredSubscriptions.length,
      upcomingRenewals: upcomingRenewals.length,
      personalCardCosts,
      reimbursementPending,
    });
  };

  const generateCostTrendData = () => {
    const days = parseInt(timeRange);
    const data = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const daySubscriptions = subscriptions.filter(s => {
        const renewalDate = new Date(s.renewalDate);
        return renewalDate.toDateString() === date.toDateString();
      });

      const dailyCost = daySubscriptions.reduce((sum, s) => {
        const dailyAmount = s.billingFrequency === "monthly" ? s.price / 30 : s.price / 365;
        return sum + dailyAmount;
      }, 0);

      data.push({
        date: date.toLocaleDateString(),
        cost: Math.round(dailyCost * 100) / 100,
        subscriptions: daySubscriptions.length,
      });
    }

    setCostTrendData(data);
  };

  const generateVendorBreakdown = () => {
    const vendorMap = new Map<string, { totalCost: number; count: number }>();

    subscriptions.forEach(s => {
      if (!s.isActive) return;
      
      const vendor = s.vendor || "Unknown";
      const monthlyCost = s.billingFrequency === "monthly" ? s.price : s.price / 12;
      
      if (vendorMap.has(vendor)) {
        const existing = vendorMap.get(vendor)!;
        vendorMap.set(vendor, {
          totalCost: existing.totalCost + monthlyCost,
          count: existing.count + 1,
        });
      } else {
        vendorMap.set(vendor, {
          totalCost: monthlyCost,
          count: 1,
        });
      }
    });

    const breakdown = Array.from(vendorMap.entries())
      .map(([vendor, data]) => ({
        vendor,
        cost: Math.round(data.totalCost * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    setVendorBreakdown(breakdown);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // const getInvoiceStatusBadge = (status: Invoice["status"]) => {
  //   switch (status) {
  //     case "paid":
  //       return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
  //     case "pending":
  //       return <Badge variant="outline">Pending</Badge>;
  //     case "overdue":
  //       return <Badge variant="destructive">Overdue</Badge>;
  //     case "cancelled":
  //       return <Badge variant="secondary">Cancelled</Badge>;
  //     default:
  //       return <Badge variant="outline">{status}</Badge>;
  //   }
  // };

  // const getStatusIcon = (status: Invoice["status"]) => {
  //   switch (status) {
  //     case "paid":
  //       return <CheckCircle className="h-4 w-4 text-green-600" />;
  //     case "pending":
  //       return <Clock className="h-4 w-4 text-yellow-600" />;
  //     case "overdue":
  //       return <AlertTriangle className="h-4 w-4 text-red-600" />;
  //     case "cancelled":
  //       return <XCircle className="h-4 w-4 text-gray-600" />;
  //     default:
  //       return <FileText className="h-4 w-4 text-gray-600" />;
  //   }
  // };

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalMonthlyCost)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeSubscriptions} active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yearly Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalYearlyCost)}</div>
            <p className="text-xs text-muted-foreground">
              Annual subscription costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Card Costs</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.personalCardCosts)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.reimbursementPending)} pending reimbursement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingRenewals}</div>
            <p className="text-xs text-muted-foreground">
              {stats.expiredSubscriptions} expired subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="trends">Cost Trends</TabsTrigger>
            <TabsTrigger value="vendors">Vendor Breakdown</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="renewals">Renewals</TabsTrigger>
          </TabsList>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Trends</CardTitle>
              <CardDescription>
                Daily cost trends over the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={costTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Daily Cost"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Breakdown</CardTitle>
                <CardDescription>
                  Monthly cost distribution by vendor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={vendorBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, vendor, cost }: any) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                            fontSize={12}
                          >
                            {vendor}: {formatCurrency(cost)}
                          </text>
                        );
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="cost"
                    >
                      {vendorBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Vendors by Cost</CardTitle>
                <CardDescription>
                  Highest monthly subscription costs by vendor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vendorBreakdown.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="vendor" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="cost" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Invoice Management</CardTitle>
                  <CardDescription>
                    Track and manage subscription invoices
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Invoice
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No invoices found</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Upload invoices to start tracking them here
                      </p>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Renewals</CardTitle>
              <CardDescription>
                Subscriptions requiring renewal in the next 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptions
                  .filter(s => {
                    const renewalDate = new Date(s.renewalDate);
                    const daysUntil = Math.ceil((renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntil > 0 && daysUntil <= 30 && s.isActive;
                  })
                  .sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime())
                  .map((subscription) => {
                    const renewalDate = new Date(subscription.renewalDate);
                    const daysUntil = Math.ceil((renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-medium">{subscription.softwareName}</h3>
                            <p className="text-sm text-gray-600">{subscription.vendor}</p>
                          </div>
                          <Badge variant={daysUntil <= 7 ? "destructive" : "outline"}>
                            {daysUntil} days
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(subscription.price)}</p>
                            <p className="text-sm text-gray-600">
                              {subscription.billingFrequency === "monthly" ? "Monthly" : "Yearly"}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                
                {subscriptions.filter(s => {
                  const renewalDate = new Date(s.renewalDate);
                  const daysUntil = Math.ceil((renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return daysUntil > 0 && daysUntil <= 30 && s.isActive;
                }).length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No upcoming renewals</p>
                    <p className="text-sm text-gray-400 mt-2">
                      All subscriptions are renewed for the next 30 days
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}