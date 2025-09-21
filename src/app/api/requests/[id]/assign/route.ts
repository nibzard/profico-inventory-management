// ABOUTME: API endpoint for assigning equipment to approved requests
// ABOUTME: Handles POST requests to link equipment with approved requests

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { withSecurity } from "@/lib/security-middleware";
import { EmailNotificationService, type EquipmentRequestEmailData } from "@/lib/email";

interface AuthenticatedRequest extends NextRequest {
  user?: {
    id?: string;
    name?: string;
    role?: string;
  };
}

const assignEquipmentSchema = z.object({
  equipmentId: z.string().cuid("Invalid equipment ID"),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSecurity(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const user = req.user;
      const requestId = id;
      
      if (!user?.id || !user?.role) {
        return NextResponse.json(
          { error: "Unauthorized - user context missing" },
          { status: 401 }
        );
      }

      // Only admins can assign equipment
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: "Forbidden - only admins can assign equipment" },
          { status: 403 }
        );
      }

      const body = await req.json();
      const validatedData = assignEquipmentSchema.parse(body);

      // Get the current request with details
      const currentRequest = await db.equipmentRequest.findUnique({
        where: { id: requestId },
        include: {
          requester: {
            select: { id: true, name: true, email: true, role: true }
          },
          equipment: {
            select: { id: true, name: true, serialNumber: true }
          }
        }
      });

      if (!currentRequest) {
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 }
        );
      }

      // Check if request is approved
      if (currentRequest.status !== 'approved') {
        return NextResponse.json(
          { error: `Cannot assign equipment to request with status: ${currentRequest.status}` },
          { status: 400 }
        );
      }

      // Check if equipment is already assigned to this request
      if (currentRequest.equipmentId) {
        return NextResponse.json(
          { error: "Equipment is already assigned to this request" },
          { status: 400 }
        );
      }

      // Get the equipment to check availability
      const equipment = await db.equipment.findUnique({
        where: { id: validatedData.equipmentId },
        include: {
          currentOwner: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!equipment) {
        return NextResponse.json(
          { error: "Equipment not found" },
          { status: 404 }
        );
      }

      // Check if equipment is available
      if (equipment.status !== 'available') {
        return NextResponse.json(
          { error: `Equipment is not available. Current status: ${equipment.status}` },
          { status: 400 }
        );
      }

      // Update both the request and equipment in a transaction
      const result = await db.$transaction(async (tx) => {
        // Update the request
        const updatedRequest = await tx.equipmentRequest.update({
          where: { id: requestId },
          data: {
            equipmentId: validatedData.equipmentId,
            status: 'fulfilled',
            updatedAt: new Date(),
            statusNotes: validatedData.notes,
          },
          include: {
            requester: {
              select: { id: true, name: true, email: true, role: true }
            },
            approver: {
              select: { id: true, name: true, email: true, role: true }
            },
            equipment: {
              select: { id: true, name: true, serialNumber: true, status: true }
            }
          }
        });

        // Update the equipment
        const updatedEquipment = await tx.equipment.update({
          where: { id: validatedData.equipmentId },
          data: {
            status: 'assigned',
            currentOwnerId: currentRequest.requesterId,
            updatedAt: new Date(),
          },
          include: {
            currentOwner: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        // Create equipment history record
        await tx.equipmentHistory.create({
          data: {
            equipmentId: validatedData.equipmentId,
            toUserId: currentRequest.requesterId,
            action: 'assigned',
            notes: `Assigned via equipment request #${requestId.slice(-8)}. ${validatedData.notes || ''}`,
          }
        });

        return { updatedRequest, updatedEquipment };
      });

      // Send notification to requester
      try {
        const emailData: EquipmentRequestEmailData = {
          id: result.updatedRequest.id,
          equipmentType: result.updatedRequest.equipmentType,
          justification: result.updatedRequest.justification,
          priority: result.updatedRequest.priority,
          neededBy: result.updatedRequest.neededBy || undefined,
          budget: result.updatedRequest.budget || undefined,
          specificRequirements: result.updatedRequest.specificRequirements || undefined,
          status: result.updatedRequest.status,
          requester: {
            id: result.updatedRequest.requester.id,
            name: result.updatedRequest.requester.name,
            email: result.updatedRequest.requester.email,
            role: result.updatedRequest.requester.role as any,
          },
          approver: result.updatedRequest.approver ? {
            id: result.updatedRequest.approver.id,
            name: result.updatedRequest.approver.name,
            email: result.updatedRequest.approver.email,
            role: result.updatedRequest.approver.role as any,
          } : undefined,
          equipment: result.updatedRequest.equipment ? {
            id: result.updatedRequest.equipment.id,
            name: result.updatedRequest.equipment.name,
            serialNumber: result.updatedRequest.equipment.serialNumber,
            status: result.updatedRequest.equipment.status,
          } : undefined,
          createdAt: result.updatedRequest.createdAt,
          updatedAt: result.updatedRequest.updatedAt,
        };

        await EmailNotificationService.notifyRequesterOfEquipmentAssignment(emailData);
      } catch (emailError) {
        console.error('Failed to send equipment assignment notification:', emailError);
        // Don't fail the assignment if email fails
      }

      return NextResponse.json({
        message: "Equipment assigned successfully",
        request: result.updatedRequest,
        equipment: result.updatedEquipment,
      });

    } catch (error) {
      console.error("Equipment assignment error:", error);

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
  }, {
    requireAuth: true,
    requiredRoles: ['admin'],
    enableRateLimit: true,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSecurity(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const user = req.user;
      const requestId = id;
      
      if (!user?.id || !user?.role) {
        return NextResponse.json(
          { error: "Unauthorized - user context missing" },
          { status: 401 }
        );
      }

      // Only admins can unassign equipment
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: "Forbidden - only admins can unassign equipment" },
          { status: 403 }
        );
      }

      // Get the current request with details
      const currentRequest = await db.equipmentRequest.findUnique({
        where: { id: requestId },
        include: {
          requester: {
            select: { id: true, name: true, email: true, role: true }
          },
          equipment: {
            select: { id: true, name: true, serialNumber: true, currentOwnerId: true }
          }
        }
      });

      if (!currentRequest) {
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 }
        );
      }

      // Check if equipment is assigned
      if (!currentRequest.equipmentId) {
        return NextResponse.json(
          { error: "No equipment is assigned to this request" },
          { status: 400 }
        );
      }

      // Unassign the equipment and update request status
      const result = await db.$transaction(async (tx) => {
        // Update the request
        const updatedRequest = await tx.equipmentRequest.update({
          where: { id: requestId },
          data: {
            equipmentId: null,
            status: 'approved', // Revert to approved status
            updatedAt: new Date(),
          },
          include: {
            requester: {
              select: { id: true, name: true, email: true, role: true }
            },
            equipment: {
              select: { id: true, name: true, serialNumber: true, status: true }
            }
          }
        });

        // Update the equipment
        const updatedEquipment = await tx.equipment.update({
          where: { id: currentRequest.equipmentId || '' },
          data: {
            status: 'available',
            currentOwnerId: null,
            updatedAt: new Date(),
          },
          include: {
            currentOwner: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        // Create equipment history record
        await tx.equipmentHistory.create({
          data: {
            equipmentId: currentRequest.equipmentId || '',
            fromUserId: currentRequest.requesterId,
            action: 'unassigned',
            notes: `Unassigned from equipment request #${requestId.slice(-8)} by admin`,
          }
        });

        return { updatedRequest, updatedEquipment };
      });

      return NextResponse.json({
        message: "Equipment unassigned successfully",
        request: result.updatedRequest,
        equipment: result.updatedEquipment,
      });

    } catch (error) {
      console.error("Equipment unassignment error:", error);

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }, {
    requireAuth: true,
    requiredRoles: ['admin'],
    enableRateLimit: true,
  });
}