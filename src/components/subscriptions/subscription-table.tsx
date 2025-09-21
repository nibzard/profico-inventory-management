// ABOUTME: Advanced subscription table component with sorting, filtering, search, and role-based actions
// ABOUTME: Modern data table with pagination, export capabilities, and responsive design

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Calendar,
  CreditCard,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Mail,
  Building,
  Key,
  FileText,
  RefreshCw,
} from "lucide-react";
import type { SubscriptionWithDetails, SubscriptionFilters, BillingCycle } from "@/types/subscription";

interface SubscriptionTableProps {
  subscriptions: SubscriptionWithDetails[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  userRole: string;
  userId: string;
  searchParams: Record<string, string>;
  availableFilters: SubscriptionFilters;
}

export function SubscriptionTable({
  subscriptions,
  currentPage,
  totalPages,
  pageSize,
  userRole,
  userId,
  searchParams,
  availableFilters,
}: SubscriptionTableProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState(searchParams);

  const getStatusBadge = (subscription: SubscriptionWithDetails) => {
    const now = new Date();
    const renewalDate = new Date(subscription.renewalDate);
    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (!subscription.isActive) {
      return <Badge variant="secondary">INACTIVE</Badge>;
    }

    if (daysUntilRenewal < 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          EXPIRED
        </Badge>
      );
    }

    if (daysUntilRenewal <= 7) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          EXPIRES SOON
        </Badge>
      );
    }

    if (daysUntilRenewal <= 30) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          RENEWING SOON
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        ACTIVE
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatRenewalDate = (date: Date) => {
    const daysUntil = Math.ceil(
      (new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) {
      return `Expired ${Math.abs(daysUntil)} days ago`;
    }

    if (daysUntil === 0) {
      return "Expires today";
    }

    if (daysUntil === 1) {
      return "Expires tomorrow";
    }

    return `Renews in ${daysUntil} days`;
  };

  const canEdit = () => {
    return userRole === "admin" || userRole === "team_lead";
  };

  const canDelete = () => {
    return userRole === "admin";
  };

  const canView = (subscription: SubscriptionWithDetails) => {
    return userRole === "admin" || userRole === "team_lead" || subscription.assignedUserId === userId;
  };

  const handleDelete = async (subscriptionId: string) => {
    if (!confirm("Are you sure you want to delete this subscription? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete subscription");
      }

      router.refresh();
    } catch (error) {
      console.error("Error deleting subscription:", error);
      alert("Failed to delete subscription. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedItems.size} subscription(s)? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedItems).map(async (subscriptionId) => {
        const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(`Failed to delete subscription ${subscriptionId}`);
        }
        return response;
      });

      await Promise.all(deletePromises);
      setSelectedItems(new Set());
      router.refresh();
    } catch (error) {
      console.error("Error bulk deleting subscriptions:", error);
      alert("Failed to delete some subscriptions. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectItem = (subscriptionId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(subscriptionId)) {
      newSelected.delete(subscriptionId);
    } else {
      newSelected.add(subscriptionId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === subscriptions.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(subscriptions.map(item => item.id)));
    }
  };

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    
    router.push(`/subscriptions?${params.toString()}`);
  };

  const clearFilters = () => {
    setLocalFilters({});
    router.push("/subscriptions");
  };

  const exportSubscriptions = () => {
    const csvHeaders = [
      "Software Name", "Vendor", "Assigned User", "Price", "Billing Cycle",
      "Payment Method", "Status", "Renewal Date", "License Key", "Notes"
    ];
    
    const csvRows = subscriptions.map(sub => [
      sub.softwareName,
      sub.vendor || "",
      sub.assignedUser.name,
      sub.price.toString(),
      sub.billingFrequency,
      sub.paymentMethod === "company_card" ? "Company Card" : "Personal Card",
      sub.isActive ? "Active" : "Inactive",
      formatDate(sub.renewalDate),
      sub.licenseKey || "",
      sub.notes || ""
    ]);
    
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No subscriptions found</p>
          <p className="text-gray-400 mt-2">
            Try adjusting your search or filter criteria
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filters
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by software name, vendor, or license key..."
                value={localFilters.search || ""}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={exportSubscriptions}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Vendor</label>
                <Select value={localFilters.vendor || ""} onValueChange={(value) => updateFilter("vendor", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All vendors</SelectItem>
                    {availableFilters.vendors.map((vendor) => (
                      <SelectItem key={vendor} value={vendor}>
                        {vendor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Billing Cycle</label>
                <Select value={localFilters.billingCycle || ""} onValueChange={(value) => updateFilter("billingCycle", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All cycles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All cycles</SelectItem>
                    {availableFilters.billingCycles.map((cycle) => (
                      <SelectItem key={cycle} value={cycle}>
                        {cycle.charAt(0) + cycle.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned To</label>
                <Select value={localFilters.assignedTo || ""} onValueChange={(value) => updateFilter("assignedTo", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All users</SelectItem>
                    {availableFilters.users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={localFilters.status || ""} onValueChange={(value) => updateFilter("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end space-x-2 lg:col-span-4">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selection Controls */}
      {subscriptions.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="select-all"
              checked={selectedItems.size === subscriptions.length && subscriptions.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Select All ({subscriptions.length})
            </label>
            {selectedItems.size > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {selectedItems.size} selected
                </Badge>
                {canDelete() && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscription Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.size === subscriptions.length && subscriptions.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Software</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Assigned User</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Renewal Date</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow 
                key={subscription.id}
                className={selectedItems.has(subscription.id) ? "bg-blue-50" : ""}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedItems.has(subscription.id)}
                    onCheckedChange={() => handleSelectItem(subscription.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{subscription.softwareName}</span>
                    {subscription.licenseKey && (
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Key className="h-3 w-3" />
                        {subscription.licenseKey}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {subscription.vendor || (
                    <span className="text-gray-400">Unknown</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {subscription.assignedUser.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{subscription.assignedUser.name}</div>
                      <div className="text-xs text-gray-500">{subscription.assignedUser.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {formatCurrency(subscription.price)}
                    </span>
                    <span className="text-xs text-gray-500">
                      /{subscription.billingFrequency === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {subscription.paymentMethod === "company_card" ? "Company" : "Personal"}
                    </span>
                    {subscription.isReimbursement && (
                      <Badge variant="outline" className="text-xs">
                        Reimbursed
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(subscription)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">{formatDate(subscription.renewalDate)}</span>
                    <span className="text-xs text-gray-500">
                      {formatRenewalDate(subscription.renewalDate)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {canView(subscription) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/subscriptions/${subscription.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>

                        {canEdit() && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/subscriptions/${subscription.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}

                        {canDelete() && (
                          <DropdownMenuItem 
                            onClick={() => handleDelete(subscription.id)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, subscriptions.length)} of {subscriptions.length} subscriptions
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => updateFilter("page", (currentPage - 1).toString())}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilter("page", page.toString())}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => updateFilter("page", (currentPage + 1).toString())}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}