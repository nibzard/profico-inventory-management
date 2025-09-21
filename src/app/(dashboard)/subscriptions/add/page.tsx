// ABOUTME: Add new subscription page with form validation
// ABOUTME: Allows admin and team leads to create new software subscriptions

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SubscriptionForm } from "@/components/forms/subscription-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function AddSubscriptionPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "admin" && session.user.role !== "team_lead") {
    redirect("/subscriptions");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" asChild>
          <Link href="/subscriptions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subscriptions
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Subscription</h1>
          <p className="text-gray-600 mt-2">
            Create a new software subscription
          </p>
        </div>
      </div>

      {/* Form */}
      <SubscriptionForm
        onSuccess={() => redirect("/subscriptions")}
        onCancel={() => redirect("/subscriptions")}
      />
    </div>
  );
}