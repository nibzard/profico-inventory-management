// ABOUTME: API endpoint for equipment request status management with email notifications
// ABOUTME: Handles GET for viewing requests and PUT for editing/updating request details

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
  equipmentType: z.string().optional(),
  category: z.string().optional(),
  justification: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  specificRequirements: z.string().optional(),
  budget: z.number().optional(),
  neededBy: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'ordered', 'fulfilled']).optional(),
  notes: z.string().optional(),
});

export async function GET(
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

      // Get the request with requester details
      const requestDetails = await db.equipmentRequest.findUnique({
        where: { id: requestId },
        include: {
          requester: {
            select: { 
              id: true, 
              name: true, 
              email: true, 
              role: true,
              image: true,
              team: {
                select: {
                  name: true,
                  leaderId: true
                }
              }
            },
          },
          approver: {
            select: { id: true, name: true, email: true, role: true }
          },
          equipment: {
            select: { id: true, name: true, serialNumber: true, status: true, currentOwner: { select: { name: true, email: true } } }
          },
        }
      });

      if (!requestDetails) {
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 }
        );
      }

      // Check if user can view this request
      if (user.role === "user" && requestDetails.requesterId !== user.id) {
        return NextResponse.json(
          { error: "Forbidden - you can only view your own requests" },
          { status: 403 }
        );
      }

      return NextResponse.json(requestDetails);

    } catch (error) {
      console.error("Request fetch error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }, {
    requireAuth: true,
    requiredRoles: ['user', 'team_lead', 'admin'],
    enableRateLimit: true,
  });
}

export async function PUT(
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

      // Check permissions
      const isRequester = currentRequest.requesterId === user.id;
      const isAdmin = user.role === 'admin';
      const isEditingOwnPendingRequest = isRequester && currentRequest.status === 'pending' && !validatedData.status;

      // Allow requesters to edit their own pending requests, admins can update status
      if (!isEditingOwnPendingRequest && !isAdmin) {
        return NextResponse.json(
          { error: "Forbidden - insufficient permissions" },
          { status: 403 }
        );
      }

      // Prevent editing non-pending requests unless admin
      if (!isAdmin && currentRequest.status !== 'pending') {
        return NextResponse.json(
          { error: "Can only edit pending requests" },
          { status: 400 }
        );
      }

      const oldStatus = currentRequest.status;

      // For status changes, apply the same validation as before
      if (validatedData.status && validatedData.status !== currentRequest.status) {
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
      }

      // Build update data
      let updateData: any = {
        updatedAt: new Date(),
      };

      // Add editable fields for requesters
      if (isEditingOwnPendingRequest) {
        if (validatedData.equipmentType !== undefined) {
          updateData.equipmentType = validatedData.equipmentType;
        }
        if (validatedData.category !== undefined) {
          updateData.category = validatedData.category;
        }
        if (validatedData.justification !== undefined) {
          updateData.justification = validatedData.justification;
        }
        if (validatedData.priority !== undefined) {
          updateData.priority = validatedData.priority;
        }
        if (validatedData.specificRequirements !== undefined) {
          updateData.specificRequirements = validatedData.specificRequirements;
        }
        if (validatedData.budget !== undefined) {
          updateData.budget = validatedData.budget;
        }
        if (validatedData.neededBy !== undefined) {
          updateData.neededBy = validatedData.neededBy ? new Date(validatedData.neededBy) : null;
        }
      }

      // Add status changes for admins
      if (validatedData.status) {
        updateData.status = validatedData.status;
      }

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

      // Send email notification for status changes
      if (validatedData.status && validatedData.status !== oldStatus) {
        try {
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
      }

      const responseMessage = isEditingOwnPendingRequest 
        ? "Request updated successfully" 
        : "Request status updated successfully";

      return NextResponse.json({
        message: responseMessage,
        request: updatedRequest,
        ...(validatedData.status && validatedData.status !== oldStatus ? {
          statusChange: {
            from: oldStatus,
            to: validatedData.status
          }
        } : {})
      });

    } catch (error) {
      console.error("Request update error:", error);

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
    requiredRoles: ['user', 'team_lead', 'admin'],
    enableRateLimit: true,
  });
}