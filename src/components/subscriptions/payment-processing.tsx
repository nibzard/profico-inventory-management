// ABOUTME: Payment processing component for subscription billing
// ABOUTME: Handles invoice payments, refunds, and transaction management

"use client";

import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  RefreshCw,
  Plus,
  Banknote,
  Building,
  CreditCard as CardIcon,
} from "lucide-react";
import type { Subscription } from "@prisma/client";

interface Invoice {
  id: string;
  subscriptionId: string;
  subscription: Subscription;
  vendor: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  invoiceUrl?: string;
  invoiceNumber?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Payment {
  id: string;
  invoiceId: string;
  invoice: Invoice;
  amount: number;
  paymentMethod: "bank_transfer" | "credit_card" | "paypal" | "other";
  transactionId?: string;
  status: "pending" | "completed" | "failed" | "refunded";
  processedAt: string;
  processedBy: string;
  notes?: string;
  refundAmount?: number;
  refundReason?: string;
}

interface PaymentProcessingProps {
  subscriptions: Subscription[];
  invoices: Invoice[];
}

interface PaymentFormData {
  invoiceId: string;
  amount: number;
  paymentMethod: "bank_transfer" | "credit_card" | "paypal" | "other";
  transactionId?: string;
  notes?: string;
}

export function PaymentProcessing({ subscriptions, invoices }: PaymentProcessingProps) {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    invoiceId: "",
    amount: 0,
    paymentMethod: "bank_transfer",
    transactionId: "",
    notes: "",
  });

  // Calculate payment statistics
  const pendingInvoices = invoices.filter(invoice => invoice.status === "pending");
  const overdueInvoices = invoices.filter(invoice => invoice.status === "overdue");
  const paidInvoices = invoices.filter(invoice => invoice.status === "paid");
  
  const totalPendingAmount = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const totalOverdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const totalPaidAmount = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      case "refunded":
        return <Badge variant="outline">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case "refunded":
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "bank_transfer":
        return <Building className="h-4 w-4" />;
      case "credit_card":
        return <CardIcon className="h-4 w-4" />;
      case "paypal":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Banknote className="h-4 w-4" />;
    }
  };

  const getSubscriptionName = (subscriptionId: string) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    return subscription?.softwareName || "Unknown Subscription";
  };

  const handleProcessPayment = async () => {
    if (!paymentData.invoiceId || !paymentData.amount) {
      alert("Please fill in all required fields");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error("Failed to process payment");
      }

      const payment = await response.json();
      
      // Add to payments list
      setPayments(prev => [payment, ...prev]);
      
      // Reset form and close dialog
      setPaymentData({
        invoiceId: "",
        amount: 0,
        paymentMethod: "bank_transfer",
        transactionId: "",
        notes: "",
      });
      setIsPaymentDialogOpen(false);
      
      // Update invoice status in the list (this would normally trigger a refetch)
      // For now, we'll simulate it
      const updatedInvoice = invoices.find(inv => inv.id === paymentData.invoiceId);
      if (updatedInvoice) {
        updatedInvoice.status = "paid";
      }
      
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Failed to process payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefund = async (paymentId: string) => {
    if (!confirm("Are you sure you want to process a refund for this payment?")) {
      return;
    }

    try {
      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to process refund");
      }

      // Update payment status in the list
      setPayments(prev => prev.map(p => 
        p.id === paymentId ? { ...p, status: "refunded" as const } : p
      ));
      
    } catch (error) {
      console.error("Error processing refund:", error);
      alert("Failed to process refund. Please try again.");
    }
  };

  const openPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      invoiceId: invoice.id,
      amount: invoice.amount,
      paymentMethod: "bank_transfer",
      transactionId: "",
      notes: "",
    });
    setIsPaymentDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payment Processing</h2>
          <p className="text-gray-600">Manage invoice payments and refunds</p>
        </div>
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Process Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
              <DialogDescription>
                Record a payment for an invoice
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Invoice Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Invoice</label>
                <Select
                  value={paymentData.invoiceId}
                  onValueChange={(value) => {
                    const invoice = invoices.find(inv => inv.id === value);
                    if (invoice) {
                      setPaymentData({ ...paymentData, invoiceId: value, amount: invoice.amount });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingInvoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {getSubscriptionName(invoice.subscriptionId)} - {formatCurrency(invoice.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-2">Amount (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentData.amount || ""}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <Select
                  value={paymentData.paymentMethod}
                  onValueChange={(value) => setPaymentData({ ...paymentData, paymentMethod: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-sm font-medium mb-2">Transaction ID (Optional)</label>
                <Input
                  value={paymentData.transactionId}
                  onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                  placeholder="Transaction reference"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                <Input
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Additional payment details"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleProcessPayment} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Process Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalPendingAmount)} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalOverdueAmount)} overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalPaidAmount)} processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">
              Payment transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Queue</CardTitle>
          <CardDescription>
            Invoices awaiting payment
          </CardDescription>
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
                <TableHead>Days Overdue</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...pendingInvoices, ...overdueInvoices]
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map((invoice) => {
                  const isOverdue = new Date(invoice.dueDate) < new Date();
                  const daysOverdue = isOverdue ? 
                    Math.ceil((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {getSubscriptionName(invoice.subscriptionId)}
                      </TableCell>
                      <TableCell>{invoice.vendor}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(invoice.status)}
                          {getStatusBadge(invoice.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {daysOverdue > 0 && (
                          <Badge variant="destructive">{daysOverdue} days</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentDialog(invoice)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                          {invoice.invoiceUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = invoice.invoiceUrl!;
                                link.download = `invoice-${invoice.id}`;
                                link.click();
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              
              {[...pendingInvoices, ...overdueInvoices].length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No pending payments</p>
                    <p className="text-sm text-gray-400 mt-2">
                      All invoices are paid or cancelled
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>
            Recent payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {getSubscriptionName(payment.invoice.subscriptionId)}
                    </TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(payment.paymentMethod)}
                        <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>{payment.transactionId || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(payment.status)}
                        {getStatusBadge(payment.status)}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(payment.processedAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {payment.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefund(payment.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        {payment.refundAmount && (
                          <Badge variant="outline">
                            Refunded {formatCurrency(payment.refundAmount)}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No payment records found</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Payment transactions will appear here
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}