// ABOUTME: Enhanced API endpoint for comprehensive maintenance workflow management
// ABOUTME: Handles maintenance scheduling, tracking, and completion with validation

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

const maintenanceWorkflowSchema = z.object({
  type: z.enum(["preventive", "corrective", "emergency", "upgrade", "inspection"]),
  description: z.string().min(1, "Description is required"),
  scheduledDate: z.string().optional(),
  estimatedCost: z.number().min(0).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().max(2000).optional(),
  expectedDuration: z.number().min(0).optional(), // in hours
  partsRequired: z.string().optional(),
});

const maintenanceUpdateSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  actualCost: z.number().min(0).optional(),
  completedDate: z.string().optional(),
  performedBy: z.string().optional(),
  resolutionNotes: z.string().max(2000).optional(),
  nextMaintenanceDate: z.string().optional(),
  warrantyClaim: z.boolean().optional(),
  invoiceUrl: z.string().optional(),
});

interface MaintenanceSchedule {
  id: string;
  equipmentId: string;
  equipmentName: string;
  serialNumber: string;
  type: string;
  status: string;
  scheduledDate: Date | null;
  priority: string;
  assignedTo: string | null;
  estimatedCost: number | null;
  overdueDays: number;
}

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
    const validatedData = maintenanceWorkflowSchema.parse(body);

    // Check if equipment exists and get current maintenance status
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

    // Check permissions
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Users cannot create maintenance records" }, { status: 403 });
    }

    // Perform maintenance workflow in transaction
    const result = await db.$transaction(async (tx) => {
      // Create maintenance record
      const maintenanceRecord = await tx.maintenanceRecord.create({
        data: {
          equipmentId,
          type: validatedData.type,
          description: validatedData.description,
          status: "pending",
          scheduledAt: validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : new Date(),
          cost: validatedData.estimatedCost || 0,
          performedBy: validatedData.assignedTo ? { connect: { id: validatedData.assignedTo } } : undefined,
          vendor: validatedData.vendor,
          notes: validatedData.notes,
        },
        include: {
          performedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Update equipment status if transitioning to maintenance
      if (equipment.status !== "maintenance") {
        await tx.equipment.update({
          where: { id: equipmentId },
          data: {
            status: "maintenance",
            lastMaintenanceDate: new Date(),
            nextMaintenanceDate: validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : undefined,
          },
        });

        // Create history record
        await tx.equipmentHistory.create({
          data: {
            equipmentId,
            fromUserId: equipment.currentOwnerId,
            action: "STATUS_MAINTENANCE",
            notes: `Maintenance scheduled: ${validatedData.description}`,
          },
        });
      }

      return maintenanceRecord;
    });

    return NextResponse.json({
      message: "Maintenance record created successfully",
      maintenance: result,
    });
  } catch (error) {
    console.error("Maintenance workflow error:", error);

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
        lastMaintenanceDate: true,
        nextMaintenanceDate: true,
        maintenanceRecords: {
          orderBy: { date: "desc" },
          take: 10,
          include: {
            performedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    return NextResponse.json({
      equipment,
      maintenanceHistory: equipment.maintenanceRecords,
    });
  } catch (error) {
    console.error("Error fetching maintenance data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const validatedData = maintenanceUpdateSchema.parse(body);

    // Check if equipment exists
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

    // Check permissions
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Users cannot update maintenance records" }, { status: 403 });
    }

    // Perform maintenance update in transaction
    const result = await db.$transaction(async (tx) => {
      // Update the most recent maintenance record
      const updatedMaintenance = await tx.maintenanceRecord.update({
        where: { id: equipment.maintenanceRecords[0].id },
        data: {
          status: validatedData.status,
          cost: validatedData.actualCost,
          completedAt: validatedData.completedDate ? new Date(validatedData.completedDate) : 
                        validatedData.status === "completed" ? new Date() : undefined,
          notes: validatedData.resolutionNotes,
        },
        include: {
          performedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Update equipment status based on maintenance completion
      if (validatedData.status === "completed") {
        await tx.equipment.update({
          where: { id: equipmentId },
          data: {
            status: "available",
            currentOwnerId: null,
            lastMaintenanceDate: new Date(),
            nextMaintenanceDate: validatedData.nextMaintenanceDate ? 
                               new Date(validatedData.nextMaintenanceDate) : undefined,
            condition: "good", // Default condition after maintenance
          },
        });

        // Create history record
        await tx.equipmentHistory.create({
          data: {
            equipmentId,
            fromUserId: equipment.currentOwnerId,
            action: "STATUS_AVAILABLE",
            condition: "good",
            notes: "Maintenance completed, equipment returned to available pool",
          },
        });
      } else if (validatedData.status === "in_progress") {
        await tx.equipment.update({
          where: { id: equipmentId },
          data: {
            status: "maintenance",
          },
        });
      }

      return updatedMaintenance;
    });

    return NextResponse.json({
      message: "Maintenance record updated successfully",
      maintenance: result,
    });
  } catch (error) {
    console.error("Maintenance update error:", error);

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