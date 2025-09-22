// ABOUTME: Page for admins to assign equipment to approved equipment requests
// ABOUTME: Shows request details and available equipment for assignment

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AssignEquipmentForm } from "@/components/requests/assign-equipment-form";
import type { Equipment, EquipmentRequest } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface EquipmentWithDetails extends Equipment {
  currentOwner?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface RequestWithDetails extends EquipmentRequest {
  requester: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  equipment?: EquipmentWithDetails | null;
}

export default async function AssignEquipmentPage({ params }: PageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect("/auth/signin");
  }

  const { user } = session;

  // Only admins can assign equipment
  if (user.role !== "admin") {
    redirect("/requests");
  }

  // Fetch the request with all related data
  const request = await db.equipmentRequest.findUnique({
    where: { id },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
      approver: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      equipment: {
        select: {
          id: true,
          name: true,
          serialNumber: true,
          status: true,
          currentOwner: {
            select: { id: true, name: true, email: true }
          }
        },
      },
    },
  });

  if (!request) {
    notFound();
  }

  // Check if request is approved and not already assigned
  if (request.status !== "approved") {
    redirect(`/requests/${id}`);
  }

  if (request.equipmentId) {
    redirect(`/requests/${id}`);
  }

  // Fetch available equipment
  const availableEquipment = await db.equipment.findMany({
    where: {
      status: "available",
      // Optional: Filter by category matching the request
      // category: request.category
    },
    include: {
      currentOwner: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: [
      { category: "asc" },
      { name: "asc" }
    ]
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Assign Equipment</h1>
        <p className="text-gray-600 mt-2">
          Assign equipment to approved request #{id.slice(-8)}
        </p>
      </div>

      <AssignEquipmentForm 
        request={request as RequestWithDetails}
        availableEquipment={availableEquipment as EquipmentWithDetails[]}
      />
    </div>
  );
}