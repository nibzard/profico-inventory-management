// ABOUTME: API endpoint for managing equipment status transitions
// ABOUTME: Handles equipment status lifecycle with validation, business rules, and history tracking

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";
import { EquipmentStatus } from "@/types";

const statusTransitionSchema = z.object({
  status: z.enum(["pending", "available", "assigned", "maintenance", "broken", "lost", "stolen", "decommissioned"]),
  reason: z.string().optional(),
  notes: z.string().max(1000).optional(),
  condition: z.enum(["excellent", "good", "fair", "poor", "broken"]).optional(),
  estimatedReturnDate: z.string().optional(),
  maintenanceProvider: z.string().optional(),
  lossReport: z.object({
    date: z.string(),
    location: z.string(),
    circumstances: z.string(),
    policeReportNumber: z.string().optional(),
  }).optional(),
});

// Valid status transitions
const validStatusTransitions: Record<string, EquipmentStatus[]> = {
  pending: ["available", "broken"],
  available: ["assigned", "maintenance", "broken", "decommissioned"],
  assigned: ["available", "maintenance", "broken", "lost", "stolen"],
  maintenance: ["available", "broken", "decommissioned"],
  broken: ["maintenance", "decommissioned"],
  lost: ["decommissioned"],
  stolen: ["decommissioned"],
  decommissioned: [], // Terminal state
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: equipmentId } = await params;
    const body = await request.json();
    const validatedData = statusTransitionSchema.parse(body);

    // Get current equipment state
    const equipment = await db.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        currentOwner: true,
        maintenanceRecords: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Check if status transition is valid
    const currentStatus = equipment.status as EquipmentStatus;
    const newStatus = validatedData.status as EquipmentStatus;
    const allowedTransitions = validStatusTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json({
        error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
        allowedTransitions,
      }, { status: 400 });
    }

    // Check permissions for specific status changes
    if (newStatus === "decommissioned" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can decommission equipment" }, { status: 403 });
    }

    if (newStatus === "maintenance" && session.user.role === "user") {
      return NextResponse.json({ error: "Users cannot mark equipment for maintenance" }, { status: 403 });
    }

    // Perform status transition in transaction
    const result = await db.$transaction(async (tx) => {
      // Prepare update data
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedBy: session.user.id,
      };

      // Handle specific status transitions
      if (newStatus === "available") {
        updateData.currentOwnerId = null;
        updateData.condition = validatedData.condition || equipment.condition;
        
        // If coming from maintenance, update maintenance record
        if (currentStatus === "maintenance" && equipment.maintenanceRecords[0]) {
          await tx.maintenanceRecord.update({
            where: { id: equipment.maintenanceRecords[0].id },
            data: {
              status: "completed",
              completedAt: new Date(),
            },
          });
        }
      }

      if (newStatus === "lost" || newStatus === "stolen") {
        updateData.currentOwnerId = null;
        if (validatedData.lossReport) {
          updateData.notes = validatedData.lossReport.circumstances;
        }
      }

      if (newStatus === "maintenance" && validatedData.maintenanceProvider) {
        updateData.notes = validatedData.maintenanceProvider;
      }

      // Update equipment
      const updatedEquipment = await tx.equipment.update({
        where: { id: equipmentId },
        data: updateData,
        include: {
          currentOwner: {
            select: { id: true, name: true, email: true },
          },
          team: {
            select: { id: true, name: true },
          },
        },
      });

      // Create maintenance record if transitioning to maintenance
      if (newStatus === "maintenance") {
        await tx.maintenanceRecord.create({
          data: {
            equipmentId,
            type: "corrective",
            status: "pending",
            scheduledAt: new Date(),
            description: validatedData.reason || "Equipment marked for maintenance",
            notes: validatedData.notes,
          },
        });
      }

      // Create history record
      await tx.equipmentHistory.create({
        data: {
          equipmentId,
          fromUserId: equipment.currentOwnerId,
          action: `STATUS_${newStatus.toUpperCase()}`,
          condition: validatedData.condition,
          notes: validatedData.notes || validatedData.reason || `Status changed from ${currentStatus} to ${newStatus}`,
        },
      });

      return updatedEquipment;
    });

    return NextResponse.json({
      message: `Equipment status changed from ${currentStatus} to ${newStatus}`,
      equipment: result,
    });
  } catch (error) {
    console.error("Equipment status transition error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: equipmentId } = await params;
    const equipment = await db.equipment.findUnique({
      where: { id: equipmentId },
      select: {
        id: true,
        name: true,
        serialNumber: true,
        status: true,
        currentOwnerId: true,
        condition: true,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Get available status transitions
    const currentStatus = equipment.status as EquipmentStatus;
    const allowedTransitions = validStatusTransitions[currentStatus] || [];

    // Filter transitions based on user role
    const userRole = session.user.role;
    const filteredTransitions = allowedTransitions.filter(status => {
      if (status === "decommissioned") return userRole === "admin";
      if (status === "maintenance") return userRole !== "user";
      return true;
    });

    return NextResponse.json({
      currentStatus,
      allowedTransitions: filteredTransitions,
      condition: equipment.condition,
      isAssigned: !!equipment.currentOwnerId,
    });
  } catch (error) {
    console.error("Error fetching status options:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}