// ABOUTME: API endpoint for approving equipment requests with role-based approval workflow
// ABOUTME: Handles POST requests for team lead and admin approval with email notifications

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

const approveRequestSchema = z.object({
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

      // Only team leads and admins can approve requests
      if (user.role !== 'team_lead' && user.role !== 'admin') {
        return NextResponse.json(
          { error: "Forbidden - insufficient permissions to approve requests" },
          { status: 403 }
        );
      }

      const body = await req.json();
      const validatedData = approveRequestSchema.parse(body);

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
          { error: `Request cannot be approved - current status: ${currentRequest.status}` },
          { status: 400 }
        );
      }

      let updateData: any = {
        approverId: user.id,
        updatedAt: new Date(),
      };

      // Determine approval workflow based on user role
      if (user.role === 'team_lead') {
        // Team lead approval
        if (currentRequest.teamLeadApproval !== null) {
          return NextResponse.json(
            { error: "Request has already been reviewed by a team lead" },
            { status: 400 }
          );
        }

        updateData.teamLeadApproval = true;

        // Check if admin approval is also needed (for high-value or special requests)
        // For now, all requests go to admin after team lead approval
        // You can modify this logic based on business rules
        const needsAdminApproval = true; // Could be based on budget, type, etc.

        if (needsAdminApproval) {
          updateData.status = 'pending'; // Still pending, waiting for admin
        } else {
          updateData.status = 'approved';
        }
      } else if (user.role === 'admin') {
        // Admin approval
        if (currentRequest.adminApproval !== null) {
          return NextResponse.json(
            { error: "Request has already been reviewed by an admin" },
            { status: 400 }
          );
        }

        // Check if team lead has approved first
        if (currentRequest.teamLeadApproval !== true) {
          return NextResponse.json(
            { error: "Team lead approval is required before admin approval" },
            { status: 400 }
          );
        }

        updateData.adminApproval = true;
        updateData.status = 'approved';
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

      // Log approval action in audit trail
      try {
        if (user.role === 'team_lead') {
          await RequestHistoryService.logTeamLeadApproval(
            requestId,
            user.id,
            validatedData.notes
          );
        } else if (user.role === 'admin') {
          await RequestHistoryService.logAdminApproval(
            requestId,
            user.id,
            validatedData.notes
          );
        }
      } catch (historyError) {
        console.error('Failed to log approval history:', historyError);
        // Don't fail the approval process if history logging fails
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

      // Send appropriate email notifications
      try {
        if (user.role === 'team_lead' && updatedRequest.status === 'pending') {
          // Team lead approved, notify admins for final approval
          const adminEmails = await EmailNotificationService.getAdminEmails();
          if (adminEmails.length > 0) {
            await EmailNotificationService.notifyAdminOfApprovalNeeded(emailData, adminEmails);
          }
        } else if (updatedRequest.status === 'approved') {
          // Final approval granted, notify the requester
          await EmailNotificationService.notifyRequesterOfApproval(emailData);
        }
      } catch (emailError) {
        console.error('Failed to send approval notifications:', emailError);
        // Don't fail the approval process if email fails
      }

      return NextResponse.json({
        message: "Request approved successfully",
        request: updatedRequest,
        nextStep: updatedRequest.status === 'pending' 
          ? 'Waiting for admin approval' 
          : 'Request fully approved'
      });

    } catch (error) {
      console.error("Request approval error:", error);

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