// ABOUTME: Budget tracking and forecasting component for subscription billing
// ABOUTME: Manages budget limits, spending alerts, and financial forecasting

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertTriangle,
  Plus,
  Edit,
  Calendar,
  PieChart,
  BarChart3,
  CheckCircle,
} from "lucide-react";
import type { Subscription } from "@prisma/client";

interface SubscriptionWithUser extends Subscription {
  assignedUser: {
    id: string;
    name: string;
    email: string;
  };
}

interface Budget {
  id: string;
  category: string;
  amount: number;
  period: "monthly" | "yearly";
  spent: number;
  alertThreshold: number; // Percentage at which to trigger alerts
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BudgetTrackingProps {
  subscriptions: SubscriptionWithUser[];
}

interface BudgetFormData {
  category: string;
  amount: number;
  period: "monthly" | "yearly";
  alertThreshold: number;
}

export function BudgetTracking({ subscriptions }: BudgetTrackingProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("12");
  const [spendingData, setSpendingData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);

  const [budgetData, setBudgetData] = useState<BudgetFormData>({
    category: "",
    amount: 0,
    period: "monthly",
    alertThreshold: 80,
  });

  useEffect(() => {
    calculateSpendingData();
    calculateForecastData();
  }, [subscriptions, selectedTimeRange]);

  const calculateSpendingData = () => {
    const months = parseInt(selectedTimeRange);
    const now = new Date();
    const data = [];

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

      data.push({
        month: monthName,
        spent: Math.round(monthCost * 100) / 100,
        budget: 5000, // Example budget amount
        variance: Math.round((5000 - monthCost) * 100) / 100,
      });
    }

    setSpendingData(data);
  };

  const calculateForecastData = () => {
    const data = [];
    const currentMonthlyCost = subscriptions
      .filter(s => s.isActive && s.billingFrequency === "monthly")
      .reduce((sum, s) => sum + s.price, 0);
    
    const currentYearlyCost = subscriptions
      .filter(s => s.isActive && s.billingFrequency === "yearly")
      .reduce((sum, s) => sum + s.price, 0);
    
    const totalMonthlyCost = currentMonthlyCost + (currentYearlyCost / 12);

    // Forecast next 12 months with slight growth
    const growthRate = 0.05; // 5% growth
    for (let i = 1; i <= 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const projectedCost = totalMonthlyCost * Math.pow(1 + growthRate / 12, i);
      
      data.push({
        month: monthName,
        projected: Math.round(projectedCost * 100) / 100,
        budget: 5000,
        confidence: Math.max(20, 95 - (i * 6)),
      });
    }

    setForecastData(data);
  };

  // Calculate current spending statistics
  const activeSubscriptions = subscriptions.filter(s => s.isActive);
  const currentMonthlyCost = activeSubscriptions
    .filter(s => s.billingFrequency === "monthly")
    .reduce((sum, s) => sum + s.price, 0);
  const currentYearlyCost = activeSubscriptions
    .filter(s => s.billingFrequency === "yearly")
    .reduce((sum, s) => sum + s.price, 0);
  const totalMonthlyCost = currentMonthlyCost + (currentYearlyCost / 12);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getBudgetStatus = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return { status: "over", color: "text-red-600", badge: "destructive" };
    if (percentage >= 80) return { status: "warning", color: "text-yellow-600", badge: "outline" };
    return { status: "good", color: "text-green-600", badge: "default" };
  };

  const handleCreateBudget = () => {
    const newBudget: Budget = {
      id: `budget-${Date.now()}`,
      category: budgetData.category,
      amount: budgetData.amount,
      period: budgetData.period,
      spent: 0,
      alertThreshold: budgetData.alertThreshold,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBudgets(prev => [...prev, newBudget]);
    setBudgetData({
      category: "",
      amount: 0,
      period: "monthly",
      alertThreshold: 80,
    });
    setIsBudgetDialogOpen(false);
  };

  const currentBudget = 5000; // Example budget
  const budgetUtilization = (totalMonthlyCost / currentBudget) * 100;
  const budgetStatus = getBudgetStatus(totalMonthlyCost, currentBudget);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Budget Tracking</h2>
          <p className="text-gray-600">Monitor spending and manage financial forecasts</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
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
          <Button onClick={() => setIsBudgetDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Budget
          </Button>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentBudget)}</div>
            <p className="text-xs text-muted-foreground">
              Current monthly limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Spending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${budgetStatus.color}`}>
              {formatCurrency(totalMonthlyCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(budgetUtilization)} of budget used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(currentBudget - totalMonthlyCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={budgetStatus.badge as any}>
                {budgetStatus.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetStatus.status === "over" ? "Over budget!" : 
               budgetStatus.status === "warning" ? "Approaching limit" : "On track"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spending vs Budget Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending vs Budget</CardTitle>
            <CardDescription>Monthly spending compared to budget limits</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="spent" fill="#8884d8" name="Spent" />
                <Bar dataKey="budget" fill="#82ca9d" name="Budget" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12-Month Forecast</CardTitle>
            <CardDescription>Projected spending based on current trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Projected"
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Budget"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Categories</CardTitle>
          <CardDescription>Manage budgets by category and department</CardDescription>
        </CardHeader>
        <CardContent>
          {budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.map((budget) => {
                const utilizationPercentage = (budget.spent / budget.amount) * 100;
                const status = getBudgetStatus(budget.spent, budget.amount);
                
                return (
                  <div key={budget.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-medium">{budget.category}</h3>
                        <p className="text-sm text-gray-600">
                          {budget.period === "monthly" ? "Monthly" : "Yearly"} budget
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}</p>
                        <p className="text-sm text-gray-600">
                          {formatPercentage(utilizationPercentage)} used
                        </p>
                      </div>
                      <Badge variant={status.badge as any}>
                        {status.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No budgets configured</p>
              <p className="text-sm text-gray-400 mt-2">
                Create budgets to track spending by category
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Insights</CardTitle>
          <CardDescription>Automated analysis and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Cost Optimization</h3>
                <p className="text-sm text-gray-600">
                  You're spending {formatCurrency(totalMonthlyCost)} monthly. 
                  {budgetUtilization < 70 ? " Consider reviewing inactive subscriptions to optimize costs." : 
                   budgetUtilization > 90 ? " You're approaching your budget limit. Consider pausing non-essential subscriptions." :
                   " Your spending is well within budget limits."}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <TrendingDown className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Forecast Analysis</h3>
                <p className="text-sm text-gray-600">
                  Based on current trends, your spending is projected to increase by 5% over the next 12 months. 
                  Consider setting up automated budget alerts.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Budget Alerts</h3>
                <p className="text-sm text-gray-600">
                  {budgetUtilization > 80 ? "You're approaching your budget limit. Review your subscriptions and consider canceling unused ones." :
                   "Set up budget alerts to be notified when spending reaches 80% of your limit."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Budget Dialog */}
      <div className="hidden">
        <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Budget</DialogTitle>
              <DialogDescription>
                Set up a new budget category
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Input
                  value={budgetData.category}
                  onChange={(e) => setBudgetData({ ...budgetData, category: e.target.value })}
                  placeholder="e.g., Software Licenses"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amount (EUR)</label>
                <Input
                  type="number"
                  value={budgetData.amount || ""}
                  onChange={(e) => setBudgetData({ ...budgetData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Period</label>
                <Select
                  value={budgetData.period}
                  onValueChange={(value) => setBudgetData({ ...budgetData, period: value as "monthly" | "yearly" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Alert Threshold (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={budgetData.alertThreshold}
                  onChange={(e) => setBudgetData({ ...budgetData, alertThreshold: parseInt(e.target.value) || 80 })}
                  placeholder="80"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBudget}>
                Create Budget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}