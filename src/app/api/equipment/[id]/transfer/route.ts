// ABOUTME: API endpoint for equipment transfer between users
// ABOUTME: Handles equipment transfer workflow with approval chains, notifications, and history tracking

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

const transferSchema = z.object({
  toUserId: z.string().cuid(),
  reason: z.string().min(1, "Transfer reason is required"),
  notes: z.string().max(1000).optional(),
  condition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  requiresApproval: z.boolean().default(true),
  immediateTransfer: z.boolean().default(false),
});

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
    const validatedData = transferSchema.parse(body);

    // Get equipment details
    const equipment = await db.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        currentOwner: true,
        team: true,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Get recipient user
    const recipient = await db.user.findUnique({
      where: { id: validatedData.toUserId },
      include: { team: true },
    });

    if (!recipient || !recipient.isActive) {
      return NextResponse.json({ error: "Recipient user not found or inactive" }, { status: 404 });
    }

    // Check permissions
    const currentUser = session.user;
    
    // Only admin, team lead, or current owner can initiate transfer
    const canTransfer = 
      currentUser.role === "admin" ||
      currentUser.role === "team_lead" ||
      equipment.currentOwnerId === currentUser.id;

    if (!canTransfer) {
      return NextResponse.json({ error: "You cannot transfer this equipment" }, { status: 403 });
    }

    // Check if equipment is available for transfer
    if (!["available", "assigned"].includes(equipment.status)) {
      return NextResponse.json({ 
        error: `Equipment cannot be transferred when status is ${equipment.status}` 
      }, { status: 400 });
    }

    // Determine if approval is needed
    let needsApproval = validatedData.requiresApproval;
    let approver = null;

    if (currentUser.role === "user") {
      // User transferring equipment needs team lead approval
      needsApproval = true;
      if (recipient.team?.leaderId) {
        approver = await db.user.findUnique({
          where: { id: recipient.team.leaderId },
        });
      }
    } else if (currentUser.role === "team_lead") {
      // Team lead transferring to another team needs admin approval
      if (equipment.team?.id !== recipient.team?.id) {
        needsApproval = true;
        approver = await db.user.findFirst({
          where: { role: "admin", isActive: true },
        });
      }
    }

    // If immediate transfer is allowed or no approval needed, transfer immediately
    if (validatedData.immediateTransfer || !needsApproval || currentUser.role === "admin") {
      return await performImmediateTransfer(equipmentId, validatedData, session);
    }

    // Otherwise, create transfer request
    const transferRequest = await db.equipmentTransferRequest.create({
      data: {
        equipmentId,
        fromUserId: equipment.currentOwnerId || null,
        toUserId: validatedData.toUserId,
        requestedById: currentUser.id,
        reason: validatedData.reason,
        notes: validatedData.notes,
        condition: validatedData.condition,
        status: "pending",
        approverId: approver?.id || null,
      },
      include: {
        fromUser: {
          select: { id: true, name: true, email: true },
        },
        toUser: {
          select: { id: true, name: true, email: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
        equipment: {
          select: { id: true, name: true, serialNumber: true },
        },
      },
    });

    return NextResponse.json({
      message: "Transfer request created and requires approval",
      transferRequest,
      requiresApproval: true,
    }, { status: 201 });
  } catch (error) {
    console.error("Equipment transfer error:", error);

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

async function performImmediateTransfer(
  equipmentId: string,
  transferData: any,
  session: any
) {
  return await db.$transaction(async (tx) => {
    // Get current equipment state
    const equipment = await tx.equipment.findUnique({
      where: { id: equipmentId },
      include: { currentOwner: true },
    });

    const updatedEquipment = await tx.equipment.update({
      where: { id: equipmentId },
      data: {
        currentOwnerId: transferData.toUserId,
        status: "assigned",
        condition: transferData.condition || equipment?.condition,
        updatedAt: new Date(),
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

    // Create history record
    await tx.equipmentHistory.create({
      data: {
        equipmentId,
        fromUserId: equipment?.currentOwnerId || null,
        toUserId: transferData.toUserId,
        action: "transferred",
        condition: transferData.condition,
        notes: transferData.notes || transferData.reason,
      },
    });

    return updatedEquipment;
  });
}

// GET endpoint to list transfer requests
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let where: any = { status };

    if (session.user.role === "user") {
      where.OR = [
        { requestedById: session.user.id },
        { toUserId: session.user.id },
      ];
    } else if (session.user.role === "team_lead") {
      where.OR = [
        { requestedById: session.user.id },
        { toUserId: session.user.id },
        { approverId: session.user.id },
        { fromUserId: session.user.id },
      ];
    }

    const [transferRequests, total] = await Promise.all([
      db.equipmentTransferRequest.findMany({
        where,
        include: {
          fromUser: {
            select: { id: true, name: true, email: true },
          },
          toUser: {
            select: { id: true, name: true, email: true },
          },
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
          approver: {
            select: { id: true, name: true, email: true },
          },
          equipment: {
            select: { id: true, name: true, serialNumber: true, category: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.equipmentTransferRequest.count({ where }),
    ]);

    return NextResponse.json({
      transferRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching transfer requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Transfer approval endpoint (could be separate, but included here for completeness)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role === "user") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: equipmentId } = await params;
    const body = await request.json();
    const { transferRequestId, action } = body;

    if (!transferRequestId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const transferRequest = await db.equipmentTransferRequest.findUnique({
      where: { id: transferRequestId },
      include: {
        equipment: true,
        fromUser: true,
        toUser: true,
      },
    });

    if (!transferRequest) {
      return NextResponse.json({ error: "Transfer request not found" }, { status: 404 });
    }

    // Check if user can approve this request
    if (transferRequest.approverId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "You cannot approve this transfer" }, { status: 403 });
    }

    if (action === "approve") {
      // Perform the transfer
      await performImmediateTransfer(
        transferRequest.equipmentId,
        {
          toUserId: transferRequest.toUserId,
          reason: transferRequest.reason,
          notes: transferRequest.notes,
          condition: transferRequest.condition,
        },
        session
      );
    }

    // Update transfer request
    const updatedTransferRequest = await db.equipmentTransferRequest.update({
      where: { id: transferRequestId },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        approverId: session.user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: `Transfer request ${action}d`,
      transferRequest: updatedTransferRequest,
    });
  } catch (error) {
    console.error("Transfer approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}