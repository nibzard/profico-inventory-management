// ABOUTME: API endpoint for rejecting equipment requests with email notifications
// ABOUTME: Handles POST requests for team lead and admin rejection with reason tracking

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { withSecurity } from "@/lib/security-middleware";
import { EmailNotificationService, type EquipmentRequestEmailData } from "@/lib/email";
import { RequestHistoryService } from "@/lib/request-history";

interface AuthenticatedRequest extends NextRequest {
  user?: {
    id?: string;
    name?: string;
    role?: string;
  };
}

const rejectRequestSchema = z.object({
  reason: z.string().min(10, "Rejection reason must be at least 10 characters").max(1000, "Rejection reason is too long"),
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

      // Only team leads and admins can reject requests
      if (user.role !== 'team_lead' && user.role !== 'admin') {
        return NextResponse.json(
          { error: "Forbidden - insufficient permissions to reject requests" },
          { status: 403 }
        );
      }

      const body = await req.json();
      const validatedData = rejectRequestSchema.parse(body);

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

      // Check if request is in pending status
      if (currentRequest.status !== 'pending') {
        return NextResponse.json(
          { error: `Request cannot be rejected - current status: ${currentRequest.status}` },
          { status: 400 }
        );
      }

      const updateData: any = {
        approverId: user.id,
        status: 'rejected',
        rejectionReason: validatedData.reason,
        updatedAt: new Date(),
      };

      // Track which level rejected the request
      if (user.role === 'team_lead') {
        if (currentRequest.teamLeadApproval !== null) {
          return NextResponse.json(
            { error: "Request has already been reviewed by a team lead" },
            { status: 400 }
          );
        }
        updateData.teamLeadApproval = false;
      } else if (user.role === 'admin') {
        if (currentRequest.adminApproval !== null) {
          return NextResponse.json(
            { error: "Request has already been reviewed by an admin" },
            { status: 400 }
          );
        }
        updateData.adminApproval = false;
      }

      // Add notes if provided
      if (validatedData.notes) {
        updateData.approvalNotes = validatedData.notes;
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

      // Log rejection action in audit trail
      try {
        if (user.role === 'team_lead') {
          await RequestHistoryService.logTeamLeadRejection(
            requestId,
            user.id,
            validatedData.reason,
            validatedData.notes
          );
        } else if (user.role === 'admin') {
          await RequestHistoryService.logAdminRejection(
            requestId,
            user.id,
            validatedData.reason,
            validatedData.notes
          );
        }
      } catch (historyError) {
        console.error('Failed to log rejection history:', historyError);
        // Don't fail the rejection process if history logging fails
      }

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

      // Send rejection notification to the requester
      try {
        await EmailNotificationService.notifyRequesterOfRejection(emailData);
      } catch (emailError) {
        console.error('Failed to send rejection notification:', emailError);
        // Don't fail the rejection process if email fails
      }

      return NextResponse.json({
        message: "Request rejected successfully",
        request: updatedRequest,
      });

    } catch (error) {
      console.error("Request rejection error:", error);

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
    requiredRoles: ['team_lead', 'admin'],
    enableRateLimit: true,
  });
}