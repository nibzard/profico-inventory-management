// ABOUTME: API endpoint for unassigning equipment from users
// ABOUTME: Handles equipment return workflow with condition tracking and history

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const unassignEquipmentSchema = z.object({
  condition: z.enum(["excellent", "good", "fair", "poor", "broken"]),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const equipmentId = params.id;
    const body = await request.json();
    const { condition, notes } = unassignEquipmentSchema.parse(body);

    // Verify equipment exists and is assigned
    const equipment = await db.equipment.findUnique({
      where: { id: equipmentId },
      include: { currentOwner: true },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    if (equipment.status !== "assigned" || !equipment.currentOwner) {
      return NextResponse.json(
        { error: "Equipment is not currently assigned" },
        { status: 400 }
      );
    }

    // Determine new status based on condition
    let newStatus = "available";
    if (condition === "broken") {
      newStatus = "broken";
    } else if (condition === "poor") {
      newStatus = "maintenance";
    }

    // Perform unassignment in transaction
    const result = await db.$transaction(async (tx) => {
      // Update equipment
      const updatedEquipment = await tx.equipment.update({
        where: { id: equipmentId },
        data: {
          currentOwnerId: null,
          status: newStatus,
          condition,
        },
        include: {
          currentOwner: true,
        },
      });

      // Create history record
      await tx.equipmentHistory.create({
        data: {
          equipmentId,
          fromUserId: equipment.currentOwnerId,
          action: "returned",
          condition,
          notes:
            notes ||
            `Returned by ${session.user.name} - Condition: ${condition}`,
        },
      });

      return updatedEquipment;
    });

    return NextResponse.json({
      message: "Equipment unassigned successfully",
      equipment: result,
      newStatus,
    });
  } catch (error) {
    console.error("Equipment unassignment error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
