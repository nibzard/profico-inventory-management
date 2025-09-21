import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { equipmentSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    const where: any = {};

    // Apply role-based filtering
    if (session.user.role === "user") {
      where.OR = [
        { currentOwnerId: session.user.id },
        { status: "available" }
      ];
    }

    // Apply search filters
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { name: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const [equipment, total] = await Promise.all([
      db.equipment.findMany({
        where,
        include: {
          currentOwner: {
            select: { id: true, name: true, email: true },
          },
          team: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      db.equipment.count({ where }),
    ]);

    return NextResponse.json({
      equipment,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "team_lead")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = equipmentSchema.parse(body);

    const equipment = await db.equipment.create({
      data: {
        ...validatedData,
        purchaseDate: new Date(validatedData.purchaseDate),
        warrantyExpiry: validatedData.warrantyExpiry ? new Date(validatedData.warrantyExpiry) : null,
        lastMaintenanceDate: validatedData.lastMaintenanceDate ? new Date(validatedData.lastMaintenanceDate) : null,
        createdBy: session.user.id,
      },
      include: {
        currentOwner: {
          select: { id: true, name: true, email: true },
        },
        team: {
          select: { id: true, name: true },
        },
      },
    });

    // Create initial history record
    await db.equipmentHistory.create({
      data: {
        equipmentId: equipment.id,
        action: "CREATED",
        performedBy: session.user.id,
        details: "Equipment added to inventory",
        previousState: null,
        newState: equipment,
      },
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      );
    }

    console.error("Error creating equipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}