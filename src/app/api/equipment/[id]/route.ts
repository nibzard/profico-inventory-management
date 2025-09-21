import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { equipmentSchema } from "@/lib/validation";

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

    const equipment = await db.equipment.findUnique({
      where: { id },
      include: {
        currentOwner: {
          select: { id: true, name: true, email: true },
        },
        maintenanceRecords: {
          orderBy: { date: "desc" },
        },
        history: {
          orderBy: { createdAt: "desc" },
          include: {
            fromUser: {
              select: { id: true, name: true },
            },
            toUser: {
              select: { id: true, name: true },
            },
          },
          take: 10,
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Check if user has permission to view this equipment
    if (session.user.role === "user" && equipment.currentOwnerId !== session.user.id && equipment.status !== "available") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const validatedData = equipmentSchema.parse(body);

    const existingEquipment = await db.equipment.findUnique({
      where: { id },
    });

    if (!existingEquipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    const updatedEquipment = await db.equipment.update({
      where: { id },
      data: {
        ...validatedData,
        purchaseDate: new Date(validatedData.purchaseDate),
        warrantyExpiry: validatedData.warrantyExpiry ? new Date(validatedData.warrantyExpiry) : null,
        lastMaintenanceDate: validatedData.lastMaintenanceDate ? new Date(validatedData.lastMaintenanceDate) : null,
      },
      include: {
        currentOwner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create history record
    await db.equipmentHistory.create({
      data: {
        equipmentId: id,
        fromUserId: session.user.id,
        action: "updated",
        notes: "Equipment details updated",
      },
    });

    return NextResponse.json(updatedEquipment);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      );
    }

    console.error("Error updating equipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingEquipment = await db.equipment.findUnique({
      where: { id },
    });

    if (!existingEquipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Soft delete by marking as decommissioned
    await db.equipment.update({
      where: { id },
      data: {
        status: "decommissioned",
        // updatedBy field doesn't exist in Equipment model
      },
    });

    // Create history record
    await db.equipmentHistory.create({
      data: {
        equipmentId: id,
        fromUserId: session.user.id,
        action: "decommissioned",
        notes: "Equipment decommissioned",
        // newState field doesn't exist in EquipmentHistory model
      },
    });

    return NextResponse.json({ message: "Equipment decommissioned successfully" });
  } catch (error) {
    console.error("Error decommissioning equipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}