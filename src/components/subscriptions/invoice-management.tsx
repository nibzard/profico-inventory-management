// ABOUTME: Invoice management component for subscription billing
// ABOUTME: Handles invoice upload, tracking, and reimbursement workflows

"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Plus,
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

interface InvoiceManagementProps {
  subscriptions: Subscription[];
  invoices?: Invoice[];
}

interface UploadInvoiceData {
  subscriptionId: string;
  vendor: string;
  amount: number;
  dueDate: string;
  invoiceNumber?: string;
  description?: string;
}

export function InvoiceManagement({ subscriptions, invoices = [] }: InvoiceManagementProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadData, setUploadData] = useState<UploadInvoiceData>({
    subscriptionId: "",
    vendor: "",
    amount: 0,
    dueDate: "",
    invoiceNumber: "",
    description: "",
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert("Please select a valid file type (PDF, JPEG, PNG, or Excel)");
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadData.subscriptionId || !uploadData.amount) {
      alert("Please fill in all required fields and select a file");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("subscriptionId", uploadData.subscriptionId);
      formData.append("vendor", uploadData.vendor);
      formData.append("amount", uploadData.amount.toString());
      formData.append("dueDate", uploadData.dueDate);
      if (uploadData.invoiceNumber) {
        formData.append("invoiceNumber", uploadData.invoiceNumber);
      }
      if (uploadData.description) {
        formData.append("description", uploadData.description);
      }

      const response = await fetch("/api/invoices", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload invoice");
      }

      // Reset form and close dialog
      setSelectedFile(null);
      setUploadData({
        subscriptionId: "",
        vendor: "",
        amount: 0,
        dueDate: "",
        invoiceNumber: "",
        description: "",
      });
      setIsUploadDialogOpen(false);
      
      // Refresh page to show new invoice
      window.location.reload();
    } catch (error) {
      console.error("Error uploading invoice:", error);
      alert("Failed to upload invoice. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`);
      if (!response.ok) {
        throw new Error("Failed to download invoice");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("Failed to download invoice. Please try again.");
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete invoice");
      }

      // Refresh page to show updated list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice. Please try again.");
    }
  };

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

  const getStatusBadge = (status: Invoice["status"]) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: Invoice["status"]) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSubscriptionName = (subscriptionId: string) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    return subscription?.softwareName || "Unknown Subscription";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Invoice Management</h2>
          <p className="text-gray-600">Track and manage subscription invoices</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Invoice</DialogTitle>
              <DialogDescription>
                Upload a new invoice for a subscription
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Invoice File</label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPEG, PNG, or Excel files (max 10MB)
                </p>
              </div>

              {/* Subscription Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Subscription</label>
                <Select
                  value={uploadData.subscriptionId}
                  onValueChange={(value) => setUploadData({ ...uploadData, subscriptionId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subscription" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptions.map((subscription) => (
                      <SelectItem key={subscription.id} value={subscription.id}>
                        {subscription.softwareName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-sm font-medium mb-2">Vendor</label>
                <Input
                  value={uploadData.vendor}
                  onChange={(e) => setUploadData({ ...uploadData, vendor: e.target.value })}
                  placeholder="Vendor name"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-2">Amount (EUR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={uploadData.amount || ""}
                  onChange={(e) => setUploadData({ ...uploadData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <Input
                  type="date"
                  value={uploadData.dueDate}
                  onChange={(e) => setUploadData({ ...uploadData, dueDate: e.target.value })}
                />
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium mb-2">Invoice Number (Optional)</label>
                <Input
                  value={uploadData.invoiceNumber}
                  onChange={(e) => setUploadData({ ...uploadData, invoiceNumber: e.target.value })}
                  placeholder="INV-001"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <Textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  placeholder="Additional notes about this invoice..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
                {isUploading ? "Uploading..." : "Upload Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoice Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">
              All invoices tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(i => i.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {invoices.filter(i => i.status === "overdue").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(invoices.reduce((sum, invoice) => sum + invoice.amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total invoice value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>
            All uploaded invoices with their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscription</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {getSubscriptionName(invoice.subscriptionId)}
                    </TableCell>
                    <TableCell>{invoice.vendor}</TableCell>
                    <TableCell>{invoice.invoiceNumber || "-"}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(invoice.status)}
                        {getStatusBadge(invoice.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(invoice.id)}
                          disabled={!invoice.invoiceUrl}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(invoice.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No invoices found</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Upload your first invoice to get started
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