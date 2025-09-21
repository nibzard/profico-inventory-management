// ABOUTME: Edit equipment request page for requesters to modify pending requests
// ABOUTME: Allows editing of request details while in pending status

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import Link from "next/link";
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

interface RequestData {
  id: string;
  equipmentType: string;
  category: string;
  justification: string;
  priority: string;
  specificRequirements?: string;
  budget?: number;
  neededBy?: string;
  status: string;
}

interface EditRequestPageProps {
  params: Promise<{ id: string }>;
}

export default function EditRequestPage({ params }: EditRequestPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [request, setRequest] = useState<RequestData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    equipmentType: "",
    category: "",
    justification: "",
    priority: "medium",
    specificRequirements: "",
    budget: "",
    neededBy: "",
  });

  useEffect(() => {
    const loadRequest = async () => {
      try {
        const session = await auth();
        if (!session) {
          router.push("/auth/signin");
          return;
        }

        const { id } = await params;
        
        // Fetch request data
        const response = await fetch(`/api/requests/${id}/status`);
        if (!response.ok) {
          if (response.status === 404) {
            router.push("/requests");
            return;
          }
          throw new Error("Failed to fetch request");
        }

        const requestData = await response.json();
        setRequest(requestData);
        setUser(session.user);

        // Check if user can edit this request
        if (requestData.requesterId !== session.user.id || requestData.status !== "pending") {
          toast.error("You don't have permission to edit this request");
          router.push(`/requests/${id}`);
          return;
        }

        // Populate form with existing data
        setFormData({
          equipmentType: requestData.equipmentType,
          category: requestData.category,
          justification: requestData.justification,
          priority: requestData.priority,
          specificRequirements: requestData.specificRequirements || "",
          budget: requestData.budget?.toString() || "",
          neededBy: requestData.neededBy?.split('T')[0] || "",
        });
      } catch (error) {
        console.error("Error loading request:", error);
        toast.error("Failed to load request");
        router.push("/requests");
      }
    };

    loadRequest();
  }, [params, router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!request) return;

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
      const updateData: any = {
        equipmentType: formData.equipmentType.trim(),
        category: formData.category,
        justification: formData.justification.trim(),
        priority: formData.priority,
        specificRequirements: formData.specificRequirements.trim() || undefined,
      };

      // Add budget if provided and valid
      if (formData.budget.trim()) {
        const budgetValue = parseFloat(formData.budget);
        if (isNaN(budgetValue) || budgetValue <= 0) {
          toast.error("Please enter a valid budget amount");
          setIsLoading(false);
          return;
        }
        updateData.budget = budgetValue;
      }

      // Add neededBy date if provided
      if (formData.neededBy) {
        updateData.neededBy = new Date(formData.neededBy).toISOString();
      }

      const response = await fetch(`/api/requests/${request.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update request");
      }

      const result = await response.json();
      toast.success("Equipment request updated successfully!");
      router.push(`/requests/${request.id}`);
    } catch (error) {
      console.error("Request update error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update request"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!request || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Loading request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/requests/${request.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Request
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Equipment Request</h1>
            <p className="text-gray-600">
              Update your equipment request details
            </p>
          </div>
        </div>

        {/* Alert Banner */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Editing Request:</strong> You can only edit requests that
            are still pending approval. Once approved, requests cannot be
            modified.
          </AlertDescription>
        </Alert>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              Update the information for your equipment request. All changes will
              be logged for audit purposes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipmentType">Equipment Type *</Label>
                  <Input
                    id="equipmentType"
                    placeholder="e.g., MacBook Pro 14-inch, iPhone 15, Dell Monitor"
                    value={formData.equipmentType}
                    onChange={(e) =>
                      handleInputChange("equipmentType", e.target.value)
                    }
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
                    onValueChange={(value) =>
                      handleInputChange("category", value)
                    }
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

                <div>
                  <Label htmlFor="budget">Budget (€)</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.budget}
                    onChange={(e) =>
                      handleInputChange("budget", e.target.value)
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Optional: Estimated budget for the equipment
                  </p>
                </div>

                <div>
                  <Label htmlFor="neededBy">Needed By</Label>
                  <Input
                    id="neededBy"
                    type="date"
                    value={formData.neededBy}
                    onChange={(e) =>
                      handleInputChange("neededBy", e.target.value)
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Optional: When do you need this equipment?
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="priority">Priority Level</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    handleInputChange("priority", value)
                  }
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
                  onChange={(e) =>
                    handleInputChange("justification", e.target.value)
                  }
                  required
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Minimum 20 characters. The more detail you provide, the faster
                  the approval process.
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
                    • Check if similar equipment is already available in the
                    system
                  </li>
                  <li>
                    • Ensure your request aligns with company equipment policies
                  </li>
                  <li>
                    • Consider if existing equipment can be reassigned instead
                  </li>
                  <li>
                    • For urgent requests, contact your team lead directly
                  </li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/requests/${request.id}`)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Updating..." : "Update Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}