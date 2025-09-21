// ABOUTME: Equipment request form component with validation and submission
// ABOUTME: Handles new equipment requests with priority and justification fields using React Hook Form and Zod validation

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requestSchemas } from "@/lib/validation";
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
import { toast } from "sonner";

const equipmentCategories = [
  { value: "computers", label: "Computers & Laptops" },
  { value: "mobile_devices", label: "Mobile Devices & Tablets" },
  { value: "peripherals", label: "Peripherals (Mouse, Keyboard, etc.)" },
  { value: "monitors", label: "Monitors & Displays" },
  { value: "networking", label: "Networking Equipment" },
  { value: "audio_video", label: "Audio/Video Equipment" },
  { value: "storage", label: "Storage Devices" },
  { value: "other", label: "Other" },
];

const equipmentExamples = [
  { category: "Computers & Laptops", examples: "MacBook Pro 14-inch, Dell XPS 15, ThinkPad T14" },
  { category: "Mobile Devices & Tablets", examples: "iPhone 15, iPad Pro, Samsung Galaxy S23" },
  { category: "Peripherals", examples: "Logitech MX Master 3, Keychron K2, Dell UltraSharp Monitor" },
  { category: "Networking Equipment", examples: "Cisco Router, Network Switch, WiFi Access Point" },
  { category: "Audio/Video Equipment", examples: "Sony WH-1000XM5, Logitech C920, Blue Yeti Mic" },
  { category: "Storage Devices", examples: "Samsung T7 SSD, Seagate External Drive, NAS Storage" },
];

const priorityLevels = [
  {
    value: "low",
    label: "Low - Nice to have",
    description: "Can wait several weeks",
  },
  {
    value: "medium",
    label: "Medium - Important",
    description: "Needed within 1-2 weeks",
  },
  {
    value: "high",
    label: "High - Critical",
    description: "Needed within a few days",
  },
  {
    value: "urgent",
    label: "Urgent - Blocking work",
    description: "Needed immediately",
  },
];

export function EquipmentRequestForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  type RequestFormData = z.infer<typeof requestSchemas.create>;

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchemas.create),
    defaultValues: {
      equipmentType: "",
      justification: "",
      priority: "medium",
      specificRequirements: "",
      budget: undefined,
      neededBy: undefined,
    },
  });

  const onSubmit = async (data: RequestFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit request");
      }

      const result = await response.json();
      toast.success("Equipment request submitted successfully!");
      router.push(`/requests/${result.id}`);
    } catch (error) {
      console.error("Request submission error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit request"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Equipment Type */}
        <FormField
          control={form.control}
          name="equipmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipment Type *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., MacBook Pro 14-inch, iPhone 15, Dell Monitor"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Be specific about the type and model if known
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Equipment Examples */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-700 mb-1">Common Examples:</p>
          <div className="space-y-1">
            {equipmentExamples.slice(0, 3).map((example) => (
              <div key={example.category} className="text-xs text-gray-600">
                <span className="font-medium">{example.category}:</span> {example.examples}
              </div>
            ))}
          </div>
        </div>

        {/* Priority Level */}
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {priorityLevels.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex flex-col">
                        <span>{priority.label}</span>
                        <span className="text-xs text-gray-500">
                          {priority.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Business Justification */}
        <FormField
          control={form.control}
          name="justification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Justification *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Explain why you need this equipment, how it will be used, and how it relates to your work responsibilities..."
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Minimum 20 characters. The more detail you provide, the faster the approval process.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Budget and Needed By */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget (€) (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 1500.00"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormDescription>
                  Specify your budget limit if applicable
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="neededBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Needed By (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ? field.value.toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormDescription>
                  When do you need this equipment?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Specific Requirements */}
        <FormField
          control={form.control}
          name="specificRequirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specific Requirements (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any specific technical requirements, preferred brands, compatibility needs, etc."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Guidelines */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800">Before Submitting</h4>
          <ul className="text-sm text-yellow-700 mt-2 space-y-1">
            <li>
              • Check if similar equipment is already available in the system
            </li>
            <li>• Ensure your request aligns with company equipment policies</li>
            <li>• Consider if existing equipment can be reassigned instead</li>
            <li>• For urgent requests, contact your team lead directly</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
