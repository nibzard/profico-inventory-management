// ABOUTME: Reimbursement management component for subscription billing
// ABOUTME: Handles reimbursement workflows for personal card payments

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ReimbursementRequest {
  id: string;
  invoiceId: string;
  invoice: Invoice;
  requestedBy: string;
  requestedByEmail: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "processed";
  submittedAt: string;
  processedAt?: string;
  processedBy?: string;
  approvedBy?: string;
  rejectionReason?: string;
  notes?: string;
}

interface ReimbursementManagementProps {
  subscriptions: Subscription[];
  invoices: Invoice[];
}

export function ReimbursementManagement({ subscriptions, invoices }: ReimbursementManagementProps) {
  const [selectedReimbursement, setSelectedReimbursement] = useState<ReimbursementRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Calculate reimbursement statistics
  const personalCardInvoices = invoices.filter(invoice => {
    const subscription = subscriptions.find(s => s.id === invoice.subscriptionId);
    return subscription?.paymentMethod === "personal_card" && subscription?.isReimbursement;
  });

  const pendingReimbursements = personalCardInvoices.filter(invoice => invoice.status === "pending");
  const approvedReimbursements = personalCardInvoices.filter(invoice => invoice.status === "paid");
  const rejectedReimbursements = personalCardInvoices.filter(invoice => invoice.status === "cancelled");

  const totalPendingAmount = pendingReimbursements.reduce((sum, invoice) => sum + invoice.amount, 0);
  const totalApprovedAmount = approvedReimbursements.reduce((sum, invoice) => sum + invoice.amount, 0);

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
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "paid":
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSubscriptionName = (subscriptionId: string) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    return subscription?.softwareName || "Unknown Subscription";
  };

  const handleViewDetails = (invoice: Invoice) => {
    // Create a mock reimbursement request for display
    const mockReimbursement: ReimbursementRequest = {
      id: `req-${invoice.id}`,
      invoiceId: invoice.id,
      invoice,
      requestedBy: "User Name", // This would come from the assigned user
      requestedByEmail: "user@example.com",
      amount: invoice.amount,
      status: invoice.status === "paid" ? "processed" : "pending",
      submittedAt: invoice.createdAt,
      processedAt: invoice.status === "paid" ? invoice.updatedAt : undefined,
      processedBy: invoice.status === "paid" ? "Admin User" : undefined,
      notes: invoice.description,
    };

    setSelectedReimbursement(mockReimbursement);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personalCardInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              Personal card payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReimbursements.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalPendingAmount)} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedReimbursements.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalApprovedAmount)} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3-5</div>
            <p className="text-xs text-muted-foreground">
              Business days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reimbursement Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Reimbursement Queue</CardTitle>
          <CardDescription>
            Track personal card payment reimbursements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscription</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Days Pending</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personalCardInvoices.length > 0 ? (
                personalCardInvoices
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((invoice) => {
                    const daysPending = Math.ceil(
                      (new Date().getTime() - new Date(invoice.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {getSubscriptionName(invoice.subscriptionId)}
                        </TableCell>
                        <TableCell>{invoice.vendor}</TableCell>
                        <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(invoice.status)}
                            {getStatusBadge(invoice.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={daysPending > 7 ? "destructive" : "outline"}>
                            {daysPending} days
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(invoice)}
                            >
                              <Eye className="h-4 w-4" />
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
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No reimbursement requests found</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Personal card payment reimbursements will appear here
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reimbursement Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reimbursement Request Details</DialogTitle>
            <DialogDescription>
              Detailed information about this reimbursement request
            </DialogDescription>
          </DialogHeader>
          
          {selectedReimbursement && (
            <div className="space-y-6">
              {/* Request Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Request ID</label>
                  <p className="font-medium">{selectedReimbursement.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedReimbursement.status)}
                    {getStatusBadge(selectedReimbursement.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Requested By</label>
                  <p className="font-medium">{selectedReimbursement.requestedBy}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="font-medium">{selectedReimbursement.requestedByEmail}</p>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Invoice Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Subscription</label>
                    <p className="font-medium">{getSubscriptionName(selectedReimbursement.invoice.subscriptionId)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vendor</label>
                    <p className="font-medium">{selectedReimbursement.invoice.vendor}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Invoice Number</label>
                    <p className="font-medium">{selectedReimbursement.invoice.invoiceNumber || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <p className="font-medium">{formatCurrency(selectedReimbursement.amount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Submitted</label>
                    <p className="font-medium">{formatDate(selectedReimbursement.submittedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Processed</label>
                    <p className="font-medium">
                      {selectedReimbursement.processedAt ? formatDate(selectedReimbursement.processedAt) : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedReimbursement.notes && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="mt-1 text-sm">{selectedReimbursement.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-500">Actions</label>
                <div className="flex space-x-2 mt-2">
                  {selectedReimbursement.invoice.invoiceUrl && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download Invoice
                    </Button>
                  )}
                  {selectedReimbursement.status === "pending" && (
                    <>
                      <Button variant="outline" size="sm">
                        Approve
                      </Button>
                      <Button variant="outline" size="sm">
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}