// ABOUTME: API endpoint for assigning equipment to users
// ABOUTME: Handles equipment assignment workflow with validation and history tracking

import { z } from "zod";
import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { commonSchemas, InputSanitizer } from "@/lib/validation";
import { withSecurity } from "@/lib/security-middleware";

async function assignEquipmentHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await params;
    const body = await request.json();
    
    // Validate input
    const validatedData = commonSchemas.cuid.safeParse(equipmentId);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid equipment ID" },
        { status: 400 }
      );
    }

    const assignSchema = z.object({
      userId: commonSchemas.cuid,
      notes: z.string().max(1000).optional(),
    });
    
    const { userId, notes } = assignSchema.parse(body);
    
    // Sanitize inputs
    const sanitizedNotes = notes ? InputSanitizer.sanitizeString(notes) : null;

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
          notes: sanitizedNotes || `Assigned by ${(request as { user?: { name?: string } }).user?.name || 'System'}`,
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSecurity(request, (req) => assignEquipmentHandler(req, { params }), {
    requireAuth: true,
    requiredRoles: ['team_lead', 'admin'],
    enableRateLimit: true,
    enableCSRF: true,
  });
}
