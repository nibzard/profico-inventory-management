// ABOUTME: API endpoint for equipment history and audit trail
// ABOUTME: Provides comprehensive history tracking with search, filtering, and analytics

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

const historyQuerySchema = z.object({
  equipmentId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.string().default("1"),
  limit: z.string().default("20"),
  includeEquipment: z.string().default("true"),
  includeUsers: z.string().default("true"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const validatedParams = historyQuerySchema.parse(Object.fromEntries(searchParams));

    const page = parseInt(validatedParams.page);
    const limit = parseInt(validatedParams.limit);
    const skip = (page - 1) * limit;

    // Build where clause based on user role and filters
    let where: any = {};

    // Apply role-based filtering
    if (session.user.role === "user") {
      // Users can only see history for equipment they own or equipment that's available
      where.OR = [
        { 
          equipment: { 
            OR: [
              { currentOwnerId: session.user.id },
              { status: "available" }
            ]
          }
        },
        { fromUserId: session.user.id },
        { toUserId: session.user.id },
        { performedBy: session.user.id },
      ];
    }

    // Apply filters
    if (validatedParams.equipmentId) {
      where.equipmentId = validatedParams.equipmentId;
    }

    if (validatedParams.userId) {
      where.OR = [
        { fromUserId: validatedParams.userId },
        { toUserId: validatedParams.userId },
        { performedBy: validatedParams.userId },
      ];
    }

    if (validatedParams.action) {
      where.action = { contains: validatedParams.action, mode: "insensitive" };
    }

    if (validatedParams.dateFrom || validatedParams.dateTo) {
      where.createdAt = {};
      if (validatedParams.dateFrom) {
        where.createdAt.gte = new Date(validatedParams.dateFrom);
      }
      if (validatedParams.dateTo) {
        where.createdAt.lte = new Date(validatedParams.dateTo);
      }
    }

    const includeOptions: any = {};
    if (validatedParams.includeEquipment === "true") {
      includeOptions.equipment = {
        select: {
          id: true,
          name: true,
          serialNumber: true,
          category: true,
          status: true,
        },
      };
    }

    if (validatedParams.includeUsers === "true") {
      includeOptions.fromUser = {
        select: { id: true, name: true, email: true },
      };
      includeOptions.toUser = {
        select: { id: true, name: true, email: true },
      };
      includeOptions.performedBy = {
        select: { id: true, name: true, email: true },
      };
    }

    // Get history records with pagination
    const [history, total] = await Promise.all([
      db.equipmentHistory.findMany({
        where,
        include: includeOptions,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.equipmentHistory.count({ where }),
    ]);

    // Generate analytics if equipmentId is provided
    let analytics = null;
    if (validatedParams.equipmentId) {
      analytics = await getEquipmentAnalytics(validatedParams.equipmentId);
    }

    return NextResponse.json({
      history,
      analytics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        equipmentId: validatedParams.equipmentId,
        userId: validatedParams.userId,
        action: validatedParams.action,
        dateFrom: validatedParams.dateFrom,
        dateTo: validatedParams.dateTo,
      },
    });
  } catch (error) {
    console.error("History fetch error:", error);

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

async function getEquipmentAnalytics(equipmentId: string) {
  // Get current equipment state
  const equipment = await db.equipment.findUnique({
    where: { id: equipmentId },
    select: {
      id: true,
      name: true,
      serialNumber: true,
      status: true,
      condition: true,
      createdAt: true,
      purchaseDate: true,
      currentOwner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!equipment) return null;

  // Get history statistics
  const stats = await db.equipmentHistory.groupBy({
    by: ["action"],
    where: { equipmentId },
    _count: { action: true },
    orderBy: { _count: { action: "desc" } },
  });

  // Get maintenance history
  const maintenanceHistory = await db.maintenanceRecord.findMany({
    where: { equipmentId },
    orderBy: { date: "desc" },
    take: 5,
  });

  // Get transfer count
  const transferCount = await db.equipmentHistory.count({
    where: {
      equipmentId,
      OR: [
        { action: "transferred" },
        { action: "assigned" },
        { action: "returned" },
      ],
    },
  });

  // Get unique owners count
  const uniqueOwners = await db.equipmentHistory.groupBy({
    by: ["toUserId"],
    where: { 
      equipmentId,
      toUserId: { not: null },
    },
    _count: { toUserId: true },
  });

  // Calculate time in different statuses
  const statusHistory = await db.$queryRaw`
    SELECT 
      status,
      COUNT(*) as count,
      AVG(julianday(COALESCE(updatedAt, datetime('now'))) - julianday(createdAt)) as avgDaysInStatus
    FROM equipment
    WHERE id = ${equipmentId}
    GROUP BY status
  ` as any[];

  return {
    currentStatus: equipment.status,
    currentCondition: equipment.condition,
    currentOwner: equipment.currentOwner,
    ageInDays: Math.floor((Date.now() - new Date(equipment.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    totalHistoryEvents: stats.reduce((sum, stat) => sum + stat._count.action, 0),
    actionDistribution: stats,
    transferCount,
    uniqueOwnerCount: uniqueOwners.length,
    maintenanceCount: maintenanceHistory.length,
    recentMaintenance: maintenanceHistory,
    statusDistribution: statusHistory,
  };
}

// POST endpoint to add manual history entries
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role === "user") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const manualHistorySchema = z.object({
      equipmentId: z.string().cuid(),
      action: z.string().min(1, "Action is required"),
      notes: z.string().min(1, "Notes are required"),
      condition: z.enum(["excellent", "good", "fair", "poor", "broken"]).optional(),
      date: z.string().optional(),
    });

    const validatedData = manualHistorySchema.parse(body);

    // Verify equipment exists
    const equipment = await db.equipment.findUnique({
      where: { id: validatedData.equipmentId },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Create manual history entry
    const historyEntry = await db.equipmentHistory.create({
      data: {
        equipmentId: validatedData.equipmentId,
        action: validatedData.action.toLowerCase(),
        notes: validatedData.notes,
        condition: validatedData.condition,
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "History entry created successfully",
      historyEntry,
    }, { status: 201 });
  } catch (error) {
    console.error("Manual history entry error:", error);

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