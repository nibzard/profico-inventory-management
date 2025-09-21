// ABOUTME: Equipment add page for creating new equipment items
// ABOUTME: Form interface for adding equipment to the inventory

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EquipmentFormWrapper } from "@/components/equipment/equipment-form-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ImageIcon } from "lucide-react";
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
              You can add photos after saving the equipment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EquipmentFormWrapper />
          </CardContent>
        </Card>

        {/* Photo Upload Note */}
        <Card className="border-dashed border-gray-300">
          <CardContent className="text-center py-8">
            <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Add Photos After Saving
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-4">
              Save the equipment details first, then you'll be able to upload photos 
              to help with identification, maintenance, and audits.
            </p>
            <div className="text-sm text-gray-400 space-y-1">
              <p>• Take clear photos from multiple angles</p>
              <p>• Include serial numbers and model labels</p>
              <p>• Capture any damage or distinctive features</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}