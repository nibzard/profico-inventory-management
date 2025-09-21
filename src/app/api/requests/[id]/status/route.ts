// ABOUTME: API endpoint for updating equipment request status with email notifications
// ABOUTME: Handles PUT requests for status changes like "ordered", "fulfilled", etc.

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

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'ordered', 'fulfilled']),
  notes: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSecurity(request, async (req: AuthenticatedRequest) => {
    try {
      const user = req.user;
      const requestId = params.id;
      
      if (!user?.id || !user?.role) {
        return NextResponse.json(
          { error: "Unauthorized - user context missing" },
          { status: 401 }
        );
      }

      // Only admins can update status (except approve/reject which have their own endpoints)
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: "Forbidden - only admins can update request status" },
          { status: 403 }
        );
      }

      const body = await req.json();
      const validatedData = updateStatusSchema.parse(body);

      // Get the current request with requester details
      const currentRequest = await db.equipmentRequest.findUnique({
        where: { id: requestId },
        include: {
          requester: {
            select: { id: true, name: true, email: true, role: true }
          },
          approver: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      });

      if (!currentRequest) {
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 }
        );
      }

      const oldStatus = currentRequest.status;

      // Prevent certain status transitions
      if (currentRequest.status === 'fulfilled') {
        return NextResponse.json(
          { error: "Cannot modify fulfilled requests" },
          { status: 400 }
        );
      }

      if (validatedData.status === 'approved' && currentRequest.status === 'rejected') {
        return NextResponse.json(
          { error: "Cannot approve a rejected request. Create a new request instead." },
          { status: 400 }
        );
      }

      // For approval/rejection, redirect to the proper endpoints
      if (validatedData.status === 'approved' || validatedData.status === 'rejected') {
        return NextResponse.json(
          { error: `Use the ${validatedData.status === 'approved' ? 'approve' : 'reject'} endpoint for this status change` },
          { status: 400 }
        );
      }

      let updateData: any = {
        status: validatedData.status,
        updatedAt: new Date(),
      };

      // Add notes if provided
      if (validatedData.notes) {
        updateData.statusNotes = validatedData.notes;
      }

      // Update the request
      const updatedRequest = await db.equipmentRequest.update({
        where: { id: requestId },
        data: updateData,
        include: {
          requester: {
            select: { id: true, name: true, email: true, role: true }
          },
          approver: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      });

      // Prepare email data
      const emailData: EquipmentRequestEmailData = {
        id: updatedRequest.id,
        equipmentType: updatedRequest.equipmentType,
        justification: updatedRequest.justification,
        priority: updatedRequest.priority,
        neededBy: updatedRequest.neededBy || undefined,
        budget: updatedRequest.budget || undefined,
        specificRequirements: updatedRequest.specificRequirements || undefined,
        status: updatedRequest.status,
        requester: {
          id: updatedRequest.requester.id,
          name: updatedRequest.requester.name,
          email: updatedRequest.requester.email,
          role: updatedRequest.requester.role as any,
        },
        approver: updatedRequest.approver ? {
          id: updatedRequest.approver.id,
          name: updatedRequest.approver.name,
          email: updatedRequest.approver.email,
          role: updatedRequest.approver.role as any,
        } : undefined,
        rejectionReason: updatedRequest.rejectionReason || undefined,
        createdAt: updatedRequest.createdAt,
        updatedAt: updatedRequest.updatedAt,
      };

      // Send status change notification
      try {
        // Determine who should be notified
        const notifyEmails: string[] = [updatedRequest.requester.email];
        
        // Also notify the approver if present
        if (updatedRequest.approver && updatedRequest.approver.email !== updatedRequest.requester.email) {
          notifyEmails.push(updatedRequest.approver.email);
        }

        await EmailNotificationService.notifyStatusChange(emailData, oldStatus, notifyEmails);
      } catch (emailError) {
        console.error('Failed to send status change notification:', emailError);
        // Don't fail the status update if email fails
      }

      return NextResponse.json({
        message: "Request status updated successfully",
        request: updatedRequest,
        statusChange: {
          from: oldStatus,
          to: validatedData.status
        }
      });

    } catch (error) {
      console.error("Request status update error:", error);

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