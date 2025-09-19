// ABOUTME: Profile form component for editing user information
// ABOUTME: Handles user data updates with form validation and submission

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { User, Team } from "@prisma/client";

interface ProfileFormProps {
  user: User & {
    team: Team | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    image: user.image || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      toast.success("Profile updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            required
            className="mt-1"
          />
          <p className="text-sm text-gray-600 mt-1">
            Your email address is used for login and notifications
          </p>
        </div>

        <div>
          <Label htmlFor="image">Profile Image URL</Label>
          <Input
            id="image"
            type="url"
            value={formData.image}
            onChange={(e) => handleInputChange("image", e.target.value)}
            placeholder="https://example.com/your-photo.jpg"
            className="mt-1"
          />
          <p className="text-sm text-gray-600 mt-1">
            Optional: Enter a URL for your profile picture
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Profile"}
        </Button>
      </div>
    </form>
  );
}
