// ABOUTME: API endpoint for equipment assignment requests with approval workflows
// ABOUTME: Handles multi-step approval processes for equipment assignments

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

const assignmentRequestSchema = z.object({
  equipmentId: z.string(),
  targetUserId: z.string(),
  requestedById: z.string(),
  assignmentType: z.enum(["standard", "temporary", "project", "emergency"]),
  justification: z.string(),
  expectedDuration: z.number().optional(),
  specificRequirements: z.string().optional(),
  location: z.string().optional(),
  budgetCode: z.string().optional(),
  approvalNotes: z.string().optional(),
  needsApproval: z.boolean(),
  approvalChain: z.array(z.string()),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

interface AssignmentRequestData {
  equipmentId: string;
  targetUserId: string;
  requestedById: string;
  assignmentType: string;
  justification: string;
  expectedDuration?: number;
  specificRequirements?: string;
  location?: string;
  budgetCode?: string;
  approvalNotes?: string;
  needsApproval: boolean;
  approvalChain: string[];
  priority: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = assignmentRequestSchema.parse(body) as AssignmentRequestData;

    // Check if equipment exists and is available
    const equipment = await db.equipment.findUnique({
      where: { id: validatedData.equipmentId },
      include: {
        currentOwner: true,
        categoryObj: true,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    if (equipment.status !== "available") {
      return NextResponse.json({ 
        error: `Equipment is not available for assignment. Current status: ${equipment.status}` 
      }, { status: 400 });
    }

    // Check if target user exists and is active
    const targetUser = await db.user.findUnique({
      where: { id: validatedData.targetUserId },
      include: {
        team: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    if (!targetUser.isActive) {
      return NextResponse.json({ error: "Target user is not active" }, { status: 400 });
    }

    // Check permissions
    const requesterRole = session.user.role;
    const canAssign = requesterRole === "admin" || requesterRole === "team_lead";
    
    if (!canAssign) {
      return NextResponse.json({ error: "You don't have permission to request equipment assignments" }, { status: 403 });
    }

    // Perform the assignment workflow in transaction
    const result = await db.$transaction(async (tx) => {
      // Create assignment request
      const assignmentRequest = await tx.equipmentTransferRequest.create({
        data: {
          equipmentId: validatedData.equipmentId,
          fromUserId: equipment.currentOwnerId?.id,
          toUserId: validatedData.targetUserId,
          requestedById: validatedData.requestedById,
          reason: validatedData.justification,
          notes: validatedData.specificRequirements || validatedData.approvalNotes,
          status: validatedData.needsApproval ? "pending" : "approved",
        },
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              serialNumber: true,
              category: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // If auto-approval (no approval chain), perform the assignment immediately
      if (!validatedData.needsApproval || validatedData.approvalChain.length === 0) {
        // Update equipment assignment
        const updatedEquipment = await tx.equipment.update({
          where: { id: validatedData.equipmentId },
          data: {
            currentOwnerId: validatedData.targetUserId,
            status: "assigned",
            condition: equipment.condition,
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
            equipmentId: validatedData.equipmentId,
            fromUserId: equipment.currentOwnerId?.id,
            toUserId: validatedData.targetUserId,
            action: "ASSIGNED",
            condition: equipment.condition,
            notes: `Equipment assigned via workflow: ${validatedData.justification}`,
          },
        });

        // Mark transfer request as approved and completed
        await tx.equipmentTransferRequest.update({
          where: { id: assignmentRequest.id },
          data: {
            status: "approved",
            approverId: validatedData.requestedById, // Self-approved
          },
        });

        return {
          request: assignmentRequest,
          equipment: updatedEquipment,
          autoApproved: true,
        };
      }

      // If approval required, create approval records
      if (validatedData.approvalChain.length > 0) {
        for (let i = 0; i < validatedData.approvalChain.length; i++) {
          const approverId = validatedData.approvalChain[i];
          
          // Create approval record (you might need an ApprovalRequest model)
          // For now, we'll use the transfer request status
          
          // Send notification (implement email notification logic)
          console.log(`Approval notification sent to ${approverId} for request ${assignmentRequest.id}`);
        }
      }

      return {
        request: assignmentRequest,
        autoApproved: false,
        approvalChain: validatedData.approvalChain,
      };
    });

    return NextResponse.json({
      message: validatedData.needsApproval && validatedData.approvalChain.length > 0 
        ? "Assignment request submitted for approval" 
        : "Equipment assigned successfully",
      data: result,
    });
  } catch (error) {
    console.error("Assignment request error:", error);

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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const userId = session.user.id;
    const userRole = session.user.role;

    // Build query based on user role
    const whereClause: any = {};
    
    if (userRole === "user") {
      // Regular users can only see their own requests
      whereClause.requestedById = userId;
    } else if (userRole === "team_lead") {
      // Team leads can see requests they need to approve or their own requests
      whereClause.OR = [
        { requestedById: userId },
        { approverId: userId },
      ];
    }
    // Admins can see all requests

    if (status !== "all") {
      whereClause.status = status;
    }

    const requests = await db.equipmentTransferRequest.findMany({
      where: whereClause,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            category: true,
            brand: true,
            model: true,
          },
        },
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      requests,
      total: requests.length,
    });
  } catch (error) {
    console.error("Error fetching assignment requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH endpoint is not available here since this route doesn't have an [id] parameter
// For approving/rejecting assignment requests, use /api/equipment/assignment-request/[id] route