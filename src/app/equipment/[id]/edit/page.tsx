// ABOUTME: Equipment edit page for modifying existing equipment
// ABOUTME: Form interface for updating equipment information

import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { EquipmentForm } from "@/components/forms/equipment-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface EquipmentEditPageProps {
  params: { id: string };
}

export default async function EquipmentEditPage({ params }: EquipmentEditPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "admin" && session.user.role !== "team_lead") {
    redirect("/dashboard");
  }

  const equipment = await db.equipment.findUnique({
    where: { id: params.id },
  });

  if (!equipment) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link href={`/equipment/${equipment.id}`}>
              <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Edit Equipment</h1>
              <p className="text-gray-600">
                Update information for {equipment.name}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Details</CardTitle>
            <CardDescription>
              Update the equipment information below. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EquipmentForm
              equipment={equipment}
              onSuccess={() => redirect(`/equipment/${equipment.id}`)}
              onCancel={() => redirect(`/equipment/${equipment.id}`)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}