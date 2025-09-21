// ABOUTME: Subscription form component for adding and editing software subscriptions
// ABOUTME: Handles subscription data validation and submission

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { subscriptionSchemas } from "@/lib/validation";
import type { Subscription } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface SubscriptionFormProps {
  subscription?: Subscription;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SubscriptionForm({ subscription, onSuccess, onCancel }: SubscriptionFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = subscription ? subscriptionSchemas.update : subscriptionSchemas.create;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      softwareName: subscription?.softwareName || "",
      assignedUserId: subscription?.assignedUserId || "",
      assignedUserEmail: subscription?.assignedUserEmail || "",
      price: subscription?.price || 0,
      billingFrequency: (subscription?.billingFrequency as "monthly" | "yearly") || "monthly",
      paymentMethod: (subscription?.paymentMethod as "company_card" | "personal_card") || "company_card",
      invoiceRecipient: subscription?.invoiceRecipient || "",
      isReimbursement: subscription?.isReimbursement || false,
      isActive: subscription?.isActive ?? true,
      renewalDate: subscription?.renewalDate ? new Date(subscription.renewalDate) : new Date(),
      vendor: subscription?.vendor || "",
      licenseKey: subscription?.licenseKey || "",
      notes: subscription?.notes || "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const url = subscription ? `/api/subscriptions/${subscription.id}` : "/api/subscriptions";
      const method = subscription ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription");
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>{subscription ? "Edit Subscription" : "Create New Subscription"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="softwareName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Software Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Adobe Creative Cloud" {...field} />
                    </FormControl>
                    <FormDescription>
                      Name of the software or service
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input placeholder="Adobe Inc." {...field} />
                    </FormControl>
                    <FormDescription>
                      Software vendor or provider
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licenseKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Key</FormLabel>
                    <FormControl>
                      <Input placeholder="XXXX-XXXX-XXXX-XXXX" {...field} />
                    </FormControl>
                    <FormDescription>
                      Software license or activation key
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Assignment and Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Assignment & Pricing</h3>
              
              <FormField
                control={form.control}
                name="assignedUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned User ID *</FormLabel>
                    <FormControl>
                      <Input placeholder="User ID from database" {...field} />
                    </FormControl>
                    <FormDescription>
                      ID of the user this subscription is assigned to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedUserEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned User Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Email of the assigned user
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="29.99"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Subscription price in EUR
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Frequency *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select billing frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How often the subscription is billed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment and Renewal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment & Renewal</h3>
              
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="company_card">Company Card</SelectItem>
                        <SelectItem value="personal_card">Personal Card</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Method used for payment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceRecipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Recipient *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="billing@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Email address for invoice notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="renewalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Renewal Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Next renewal date for the subscription
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isReimbursement"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Reimbursement Required
                      </FormLabel>
                      <FormDescription>
                        Check if this personal card payment needs reimbursement
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Active Subscription
                      </FormLabel>
                      <FormDescription>
                        Uncheck if subscription is inactive or cancelled
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this subscription..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Any additional information about the subscription
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : subscription ? "Update Subscription" : "Create Subscription"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}