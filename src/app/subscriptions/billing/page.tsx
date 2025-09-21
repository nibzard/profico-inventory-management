// ABOUTME: Billing management page for subscription system
// ABOUTME: Comprehensive billing dashboard with invoice management

import { BillingDashboard } from "@/components/subscriptions/billing-dashboard";
import { InvoiceManagement } from "@/components/subscriptions/invoice-management";
import { ReimbursementManagement } from "@/components/subscriptions/reimbursement-management";
import { BillingAnalytics } from "@/components/subscriptions/billing-analytics";
import { PaymentProcessing } from "@/components/subscriptions/payment-processing";
import { BudgetTracking } from "@/components/subscriptions/budget-tracking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, TrendingUp, CreditCard } from "lucide-react";

export default async function BillingPage() {
  // Fetch subscriptions and invoices data
  const subscriptionsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/subscriptions`, {
    cache: 'no-store',
  });
  
  const invoicesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/invoices`, {
    cache: 'no-store',
  });

  const subscriptionsData = await subscriptionsResponse.json();
  const invoicesData = await invoicesResponse.json();

  const subscriptions = subscriptionsData.subscriptions || [];
  const invoices = invoicesData.invoices || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Subscription Billing</h1>
        <p className="text-gray-600 mt-2">
          Manage subscription costs, invoices, and billing analytics
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Invoices</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Payments</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Budget</span>
          </TabsTrigger>
          <TabsTrigger value="reimbursements" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Reimbursements</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <BillingDashboard subscriptions={subscriptions} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceManagement 
            subscriptions={subscriptions} 
            invoices={invoices} 
          />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentProcessing subscriptions={subscriptions} invoices={invoices} />
        </TabsContent>

        <TabsContent value="analytics">
          <BillingAnalytics subscriptions={subscriptions} invoices={invoices} />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetTracking subscriptions={subscriptions} />
        </TabsContent>

        <TabsContent value="reimbursements">
          <ReimbursementManagement subscriptions={subscriptions} invoices={invoices} />
        </TabsContent>
      </Tabs>
    </div>
  );
}