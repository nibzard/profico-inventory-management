// ABOUTME: Edit subscription page with form validation
// ABOUTME: Allows admin and team leads to modify existing software subscriptions

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SubscriptionForm } from "@/components/forms/subscription-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface EditSubscriptionPageProps {
  params: {
    id: string;
  };
}

export default async function EditSubscriptionPage({
  params,
}: EditSubscriptionPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "admin" && session.user.role !== "team_lead") {
    redirect("/subscriptions");
  }

  const subscription = await db.subscription.findUnique({
    where: { id: params.id },
  });

  if (!subscription) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" asChild>
          <Link href={`/subscriptions/${subscription.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subscription
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Subscription</h1>
          <p className="text-gray-600 mt-2">
            Update software subscription information
          </p>
        </div>
      </div>

      {/* Form */}
      <SubscriptionForm
        subscription={subscription}
        onSuccess={() => redirect(`/subscriptions/${subscription.id}`)}
        onCancel={() => redirect(`/subscriptions/${subscription.id}`)}
      />
    </div>
  );
}