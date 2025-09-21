// ABOUTME: Equipment add page for creating new equipment items
// ABOUTME: Form interface for adding equipment to the inventory

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EquipmentForm } from "@/components/forms/equipment-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function AddEquipmentPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "admin" && session.user.role !== "team_lead") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link href="/equipment">
              <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Add Equipment</h1>
              <p className="text-gray-600">
                Add new equipment to the inventory system
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Details</CardTitle>
            <CardDescription>
              Fill in the equipment information below. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EquipmentForm
              onSuccess={() => redirect("/equipment")}
              onCancel={() => redirect("/equipment")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}