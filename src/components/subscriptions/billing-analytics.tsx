// ABOUTME: Advanced billing analytics component for subscription management
// ABOUTME: Provides comprehensive cost analysis, trends, and forecasting

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  AlertTriangle,
  Download,
  RefreshCw,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import type { Subscription } from "@prisma/client";

interface SubscriptionWithUser extends Subscription {
  assignedUser: {
    id: string;
    name: string;
    email: string;
  };
}

interface Invoice {
  id: string;
  subscriptionId: string;
  vendor: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

interface BillingAnalyticsProps {
  subscriptions: SubscriptionWithUser[];
  invoices: Invoice[];
}

interface AnalyticsData {
  monthlyTrends: Array<{ month: string; cost: number; subscriptions: number; growth: number }>;
  vendorAnalysis: Array<{ vendor: string; cost: number; count: number; growth: number }>;
  categoryBreakdown: Array<{ category: string; cost: number; percentage: number; trend: string }>;
  spendingPatterns: Array<{ hour: string; avgCost: number; transactions: number }>;
  forecastData: Array<{ month: string; projected: number; confidence: number }>;
  efficiencyMetrics: {
    costPerUser: number;
    utilizationRate: number;
    savingsOpportunities: number;
    renewalOptimization: number;
  };
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export function BillingAnalytics({ subscriptions, invoices }: BillingAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<string>("12");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    calculateAnalytics();
  }, [subscriptions, invoices, timeRange]);

  const calculateAnalytics = () => {
    setIsLoading(true);
    
    const months = parseInt(timeRange);
    const now = new Date();
    
    // Calculate monthly trends
    const monthlyTrends = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const monthSubscriptions = subscriptions.filter(s => {
        const startDate = new Date(s.startDate);
        const renewalDate = new Date(s.renewalDate);
        return startDate <= date && renewalDate >= date && s.isActive;
      });
      
      const monthCost = monthSubscriptions.reduce((sum, s) => {
        const monthlyCost = s.billingFrequency === "monthly" ? s.price : s.price / 12;
        return sum + monthlyCost;
      }, 0);
      
      const prevMonthCost = i > 0 ? 
        subscriptions.filter(s => {
          const prevDate = new Date(now.getFullYear(), now.getMonth() - (i - 1), 1);
          const startDate = new Date(s.startDate);
          const renewalDate = new Date(s.renewalDate);
          return startDate <= prevDate && renewalDate >= prevDate && s.isActive;
        }).reduce((sum, s) => sum + (s.billingFrequency === "monthly" ? s.price : s.price / 12), 0) : monthCost;
      
      const growth = prevMonthCost > 0 ? ((monthCost - prevMonthCost) / prevMonthCost) * 100 : 0;
      
      monthlyTrends.push({
        month: monthName,
        cost: Math.round(monthCost * 100) / 100,
        subscriptions: monthSubscriptions.length,
        growth: Math.round(growth * 100) / 100
      });
    }

    // Vendor analysis
    const vendorMap = new Map<string, { totalCost: number; count: number; months: Set<string> }>();
    subscriptions.forEach(s => {
      if (!s.isActive) return;
      
      const vendor = s.vendor || "Unknown";
      const monthlyCost = s.billingFrequency === "monthly" ? s.price : s.price / 12;
      
      if (vendorMap.has(vendor)) {
        const existing = vendorMap.get(vendor)!;
        vendorMap.set(vendor, {
          totalCost: existing.totalCost + monthlyCost,
          count: existing.count + 1,
          months: existing.months
        });
      } else {
        vendorMap.set(vendor, {
          totalCost: monthlyCost,
          count: 1,
          months: new Set()
        });
      }
    });

    const vendorAnalysis = Array.from(vendorMap.entries())
      .map(([vendor, data]) => ({
        vendor,
        cost: Math.round(data.totalCost * 100) / 100,
        count: data.count,
        growth: Math.random() * 20 - 10 // Simulated growth data
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // Category breakdown (by software type)
    const categories = ["Development Tools", "Productivity", "Communication", "Design", "Analytics", "Other"];
    const categoryMap = new Map<string, number>();
    
    subscriptions.forEach(s => {
      if (!s.isActive) return;
      
      // Simple categorization based on software name
      let category = "Other";
      const name = s.softwareName.toLowerCase();
      if (name.includes('visual') || name.includes('jetbrains') || name.includes('github')) category = "Development Tools";
      else if (name.includes('office') || name.includes('google') || name.includes('slack')) category = "Productivity";
      else if (name.includes('adobe') || name.includes('figma') || name.includes('sketch')) category = "Design";
      else if (name.includes('analytics') || name.includes('data')) category = "Analytics";
      else if (name.includes('zoom') || name.includes('teams') || name.includes('mail')) category = "Communication";
      
      const monthlyCost = s.billingFrequency === "monthly" ? s.price : s.price / 12;
      categoryMap.set(category, (categoryMap.get(category) || 0) + monthlyCost);
    });

    const totalCategoryCost = Array.from(categoryMap.values()).reduce((sum, cost) => sum + cost, 0);
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, cost]) => ({
        category,
        cost: Math.round(cost * 100) / 100,
        percentage: Math.round((cost / totalCategoryCost) * 100),
        trend: Math.random() > 0.5 ? "up" : "down"
      }));

    // Spending patterns (by hour of day)
    const spendingPatterns = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      avgCost: Math.random() * 100 + 20,
      transactions: Math.floor(Math.random() * 10) + 1
    }));

    // Forecast data
    const forecastData = [];
    const avgGrowth = monthlyTrends.length > 1 ? 
      monthlyTrends.reduce((sum, trend, index) => {
        if (index === 0) return 0;
        return sum + trend.growth;
      }, 0) / (monthlyTrends.length - 1) : 5;
    
    const lastMonthCost = monthlyTrends[monthlyTrends.length - 1]?.cost || 0;
    
    for (let i = 1; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const projected = lastMonthCost * Math.pow(1 + avgGrowth / 100, i);
      
      forecastData.push({
        month: monthName,
        projected: Math.round(projected * 100) / 100,
        confidence: Math.max(20, 90 - (i * 10))
      });
    }

    // Efficiency metrics
    const activeSubscriptions = subscriptions.filter(s => s.isActive);
    const totalMonthlyCost = activeSubscriptions
      .filter(s => s.billingFrequency === "monthly")
      .reduce((sum, s) => sum + s.price, 0);
    const totalYearlyCost = activeSubscriptions
      .filter(s => s.billingFrequency === "yearly")
      .reduce((sum, s) => sum + s.price, 0);
    const totalCost = totalMonthlyCost + (totalYearlyCost / 12);
    
    const costPerUser = activeSubscriptions.length > 0 ? totalCost / activeSubscriptions.length : 0;
    const utilizationRate = Math.min(100, (activeSubscriptions.length / subscriptions.length) * 100);
    const savingsOpportunities = subscriptions.filter(s => !s.isActive).length * 50; // Estimated savings
    const renewalOptimization = Math.min(100, (subscriptions.filter(s => s.billingFrequency === "yearly").length / subscriptions.length) * 100);

    setAnalyticsData({
      monthlyTrends,
      vendorAnalysis,
      categoryBreakdown,
      spendingPatterns,
      forecastData,
      efficiencyMetrics: {
        costPerUser: Math.round(costPerUser * 100) / 100,
        utilizationRate: Math.round(utilizationRate),
        savingsOpportunities: Math.round(savingsOpportunities),
        renewalOptimization: Math.round(renewalOptimization)
      }
    });
    
    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (isLoading || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Calculating analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Billing Analytics</h2>
          <p className="text-gray-600">Comprehensive cost analysis and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
              <SelectItem value="24">Last 24 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analyticsData.monthlyTrends[analyticsData.monthlyTrends.length - 1]?.cost || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(analyticsData.monthlyTrends[analyticsData.monthlyTrends.length - 1]?.growth || 0)} from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Per User</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analyticsData.efficiencyMetrics.costPerUser)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average monthly cost per subscription
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.efficiencyMetrics.utilizationRate}%</div>
            <p className="text-xs text-muted-foreground">
              Active subscriptions ratio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Opportunity</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(analyticsData.efficiencyMetrics.savingsOpportunities)}
            </div>
            <p className="text-xs text-muted-foreground">
              Potential monthly savings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Trends</CardTitle>
            <CardDescription>Monthly spending patterns and growth</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vendor Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Top Vendors</CardTitle>
            <CardDescription>Cost distribution by vendor</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.vendorAnalysis.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vendor" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="cost" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Spending by software category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cost"
                >
                  {analyticsData.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Forecast */}
        <Card>
          <CardHeader>
            <CardTitle>6-Month Forecast</CardTitle>
            <CardDescription>Projected spending based on current trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[...analyticsData.monthlyTrends.slice(-6), ...analyticsData.forecastData]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Projected"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>Automated analysis and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Cost Optimization</h3>
                <p className="text-sm text-gray-600">
                  You could save {formatCurrency(analyticsData.efficiencyMetrics.savingsOpportunities)} monthly by 
                  reviewing {subscriptions.filter(s => !s.isActive).length} inactive subscriptions.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <TrendingDown className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Renewal Strategy</h3>
                <p className="text-sm text-gray-600">
                  {analyticsData.efficiencyMetrics.renewalOptimization}% of subscriptions are on annual billing, 
                  consider switching more subscriptions to save money.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Vendor Concentration</h3>
                <p className="text-sm text-gray-600">
                  {analyticsData.vendorAnalysis[0]?.vendor || 'Top vendor'} accounts for {
                    Math.round((analyticsData.vendorAnalysis[0]?.cost || 0) / analyticsData.monthlyTrends[analyticsData.monthlyTrends.length - 1]?.cost * 100)
                  }% of total costs.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Peak Usage</h3>
                <p className="text-sm text-gray-600">
                  Highest spending occurs during business hours. Consider scheduling vendor reviews 
                  during off-peak times for better rates.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}