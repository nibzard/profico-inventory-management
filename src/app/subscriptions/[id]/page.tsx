// ABOUTME: Individual subscription detail page with full information
// ABOUTME: Shows detailed subscription information and management options

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Edit,
  CreditCard,
  Calendar,
  DollarSign,
  Mail,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface SubscriptionDetailPageProps {
  params: {
    id: string;
  };
}

export default async function SubscriptionDetailPage({
  params,
}: SubscriptionDetailPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const subscription = await db.subscription.findUnique({
    where: { id: params.id },
    include: {
      assignedUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!subscription) {
    notFound();
  }

  // Check access permissions
  if (session.user.role === "user" && subscription.assignedUserId !== session.user.id) {
    redirect("/subscriptions");
  }

  const canEdit = session.user.role === "admin" || session.user.role === "team_lead";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/subscriptions">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Subscriptions
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{subscription.softwareName}</h1>
            <p className="text-gray-600 mt-2">
              Software subscription details
            </p>
          </div>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href={`/subscriptions/${subscription.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Subscription
            </Link>
          </Button>
        )}
      </div>

      {/* Status and Key Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {subscription.isActive ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getStatusBadge(subscription.isActive, subscription.renewalDate)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(subscription.price)}
            </div>
            <p className="text-xs text-muted-foreground">
              per {subscription.billingFrequency === "monthly" ? "month" : "year"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renewal</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(subscription.renewalDate).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatRenewalDate(subscription.renewalDate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscription.paymentMethod === "company_card" ? "Company" : "Personal"}
            </div>
            <p className="text-xs text-muted-foreground">
              {subscription.isReimbursement ? "Reimbursed" : "No reimbursement"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Software Name:</span>
              <span className="font-medium">{subscription.softwareName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Vendor:</span>
              <span className="font-medium">{subscription.vendor || "Not specified"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">License Key:</span>
              <span className="font-medium font-mono">{subscription.licenseKey || "Not specified"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Billing Frequency:</span>
              <span className="font-medium">
                {subscription.billingFrequency.charAt(0).toUpperCase() + subscription.billingFrequency.slice(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Payment Method:</span>
              <span className="font-medium">
                {subscription.paymentMethod === "company_card" ? "Company Card" : "Personal Card"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Reimbursement:</span>
              <span className="font-medium">
                {subscription.isReimbursement ? "Required" : "Not required"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Assignment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={subscription.assignedUser.image || ""} />
                <AvatarFallback>
                  {subscription.assignedUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{subscription.assignedUser.name}</div>
                <div className="text-sm text-gray-600">{subscription.assignedUser.email}</div>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Invoice Recipient:</span>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{subscription.invoiceRecipient}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created:</span>
              <span className="font-medium">
                {new Date(subscription.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Last Updated:</span>
              <span className="font-medium">
                {new Date(subscription.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {subscription.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap">{subscription.notes}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}