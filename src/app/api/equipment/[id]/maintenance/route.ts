import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

const maintenanceSchema = z.object({
  type: z.enum(["preventive", "corrective", "emergency", "upgrade", "inspection"]),
  date: z.string(),
  description: z.string().min(1, "Description is required"),
  cost: z.number().min(0, "Cost must be non-negative"),
  performedBy: z.string().min(1, "Performer is required"),
  notes: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const maintenanceRecords = await db.maintenanceRecord.findMany({
      where: { equipmentId: id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(maintenanceRecords);
  } catch (error) {
    console.error("Error fetching maintenance records:", error);
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
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "team_lead")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = maintenanceSchema.parse(body);

    const equipment = await db.equipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Create maintenance record
    const maintenanceRecord = await db.maintenanceRecord.create({
      data: {
        equipmentId: id,
        type: validatedData.type,
        date: new Date(validatedData.date),
        description: validatedData.description,
        cost: validatedData.cost,
        performedBy: validatedData.performedBy,
        notes: validatedData.notes || null,
      },
    });

    // Update equipment with new maintenance dates
    const updateData: Record<string, unknown> = {
      lastMaintenanceDate: new Date(validatedData.date),
      updatedBy: session.user.id,
    };

    if (validatedData.nextMaintenanceDate) {
      updateData.nextMaintenanceDate = new Date(validatedData.nextMaintenanceDate);
    }

    // Update equipment status if it was in maintenance
    if (equipment.status === "maintenance") {
      updateData.status = "available";
    }

    const updatedEquipment = await db.equipment.update({
      where: { id },
      data: updateData,
    });

    // Create history record
    await db.equipmentHistory.create({
      data: {
        equipmentId: id,
        fromUserId: session.user.id,
        action: "maintenance",
        notes: `${validatedData.type.toUpperCase()} maintenance performed`,
      },
    });

    return NextResponse.json(maintenanceRecord, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating maintenance record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}