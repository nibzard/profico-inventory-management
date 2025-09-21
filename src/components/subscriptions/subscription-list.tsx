// ABOUTME: Subscription list component displaying software subscriptions with pagination
// ABOUTME: Shows subscription items with actions based on user role and billing status

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Calendar,
  CreditCard,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Subscription, User } from "@prisma/client";

interface SubscriptionWithUser extends Subscription {
  assignedUser: User;
}

interface SubscriptionListProps {
  subscriptions: SubscriptionWithUser[];
  currentPage: number;
  totalPages: number;
  userRole: string;
  userId: string;
}

export function SubscriptionList({
  subscriptions,
  currentPage,
  totalPages,
  userRole,
}: SubscriptionListProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const getStatusBadge = (isActive: boolean, renewalDate: Date) => {
    const daysUntilRenewal = Math.ceil(
      (new Date(renewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (!isActive) {
      return <Badge variant="secondary">INACTIVE</Badge>;
    }

    if (daysUntilRenewal < 0) {
      return <Badge variant="destructive">EXPIRED</Badge>;
    }

    if (daysUntilRenewal <= 7) {
      return <Badge variant="destructive">EXPIRES SOON</Badge>;
    }

    if (daysUntilRenewal <= 30) {
      return <Badge variant="outline">RENEWING SOON</Badge>;
    }

    return <Badge variant="default">ACTIVE</Badge>;
  };

  const canEdit = () => {
    return userRole === "admin" || userRole === "team_lead";
  };

  const canView = (subscription: SubscriptionWithUser) => {
    return userRole === "admin" || userRole === "team_lead" || subscription.assignedUserId === userId;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
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

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
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
              Select All
            </label>
            {selectedItems.size > 0 && (
              <Badge variant="secondary">
                {selectedItems.size} selected
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Subscription Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptions.map((subscription) => (
          <Card key={subscription.id} className={`hover:shadow-lg transition-shadow ${selectedItems.has(subscription.id) ? 'ring-2 ring-blue-500' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-2 flex-1">
                  <Checkbox
                    checked={selectedItems.has(subscription.id)}
                    onCheckedChange={() => handleSelectItem(subscription.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <CardTitle className="text-lg">{subscription.softwareName}</CardTitle>
                    <CardDescription>
                      {subscription.vendor || "Unknown Vendor"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(subscription.isActive, subscription.renewalDate)}
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
                          <DropdownMenuItem asChild>
                            <Link href={`/subscriptions/${subscription.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Assigned User */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Assigned to:</span>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={subscription.assignedUser.image || ""} />
                      <AvatarFallback className="text-xs">
                        {subscription.assignedUser.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{subscription.assignedUser.name}</span>
                  </div>
                </div>

                {/* Price and Billing */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Price:</span>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      {formatCurrency(subscription.price)}/{subscription.billingFrequency === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Payment:</span>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {subscription.paymentMethod === "company_card" ? "Company Card" : "Personal Card"}
                      {subscription.isReimbursement && " (Reimbursed)"}
                    </span>
                  </div>
                </div>

                {/* Renewal Date */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Renewal:</span>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {formatRenewalDate(subscription.renewalDate)}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-2 border-t">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Link href={`/subscriptions/${subscription.id}`}>
                      View Full Details
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            asChild
          >
            <Link href={`/subscriptions?page=${currentPage - 1}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 2
              )
              .map((page, index, array) => (
                <div key={page} className="flex items-center">
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="text-gray-400 px-2">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    asChild
                  >
                    <Link href={`/subscriptions?page=${page}`}>{page}</Link>
                  </Button>
                </div>
              ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            asChild
          >
            <Link href={`/subscriptions?page=${currentPage + 1}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}