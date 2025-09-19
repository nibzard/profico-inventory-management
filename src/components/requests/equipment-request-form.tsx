// ABOUTME: Equipment request form component with validation and submission
// ABOUTME: Handles new equipment requests with priority and justification fields

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [formData, setFormData] = useState({
    equipmentType: "",
    category: "",
    justification: "",
    priority: "medium",
    specificRequirements: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.equipmentType.trim()) {
      toast.error("Please specify the equipment type");
      return;
    }

    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }

    if (
      !formData.justification.trim() ||
      formData.justification.trim().length < 20
    ) {
      toast.error(
        "Please provide a detailed justification (at least 20 characters)"
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          equipmentType: formData.equipmentType.trim(),
          category: formData.category,
          justification: formData.justification.trim(),
          priority: formData.priority,
          specificRequirements:
            formData.specificRequirements.trim() || undefined,
        }),
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="equipmentType">Equipment Type *</Label>
          <Input
            id="equipmentType"
            placeholder="e.g., MacBook Pro 14-inch, iPhone 15, Dell Monitor"
            value={formData.equipmentType}
            onChange={(e) => handleInputChange("equipmentType", e.target.value)}
            required
            className="mt-1"
          />
          <p className="text-xs text-gray-600 mt-1">
            Be specific about the type and model if known
          </p>
        </div>

        <div>
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => handleInputChange("category", value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select equipment category" />
            </SelectTrigger>
            <SelectContent>
              {equipmentCategories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="priority">Priority Level</Label>
        <Select
          value={formData.priority}
          onValueChange={(value) => handleInputChange("priority", value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
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
      </div>

      <div>
        <Label htmlFor="justification">Business Justification *</Label>
        <Textarea
          id="justification"
          placeholder="Explain why you need this equipment, how it will be used, and how it relates to your work responsibilities..."
          value={formData.justification}
          onChange={(e) => handleInputChange("justification", e.target.value)}
          required
          rows={4}
          className="mt-1"
        />
        <p className="text-xs text-gray-600 mt-1">
          Minimum 20 characters. The more detail you provide, the faster the
          approval process.
        </p>
      </div>

      <div>
        <Label htmlFor="specificRequirements">
          Specific Requirements (Optional)
        </Label>
        <Textarea
          id="specificRequirements"
          placeholder="Any specific technical requirements, preferred brands, compatibility needs, etc."
          value={formData.specificRequirements}
          onChange={(e) =>
            handleInputChange("specificRequirements", e.target.value)
          }
          rows={3}
          className="mt-1"
        />
      </div>

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

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </form>
  );
}
