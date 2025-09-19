// ABOUTME: API endpoint for assigning equipment to users
// ABOUTME: Handles equipment assignment workflow with validation and history tracking

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const assignEquipmentSchema = z.object({
  userId: z.string().cuid(),
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
    const { userId, notes } = assignEquipmentSchema.parse(body);

    // Verify equipment exists and is available
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

    if (equipment.status !== "available") {
      return NextResponse.json(
        { error: "Equipment is not available for assignment" },
        { status: 400 }
      );
    }

    // Verify user exists and is active
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 400 }
      );
    }

    // Perform assignment in transaction
    const result = await db.$transaction(async (tx) => {
      // Update equipment
      const updatedEquipment = await tx.equipment.update({
        where: { id: equipmentId },
        data: {
          currentOwnerId: userId,
          status: "assigned",
        },
        include: {
          currentOwner: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Create history record
      await tx.equipmentHistory.create({
        data: {
          equipmentId,
          toUserId: userId,
          action: "assigned",
          notes: notes || `Assigned by ${session.user.name}`,
        },
      });

      return updatedEquipment;
    });

    return NextResponse.json({
      message: "Equipment assigned successfully",
      equipment: result,
    });
  } catch (error) {
    console.error("Equipment assignment error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
