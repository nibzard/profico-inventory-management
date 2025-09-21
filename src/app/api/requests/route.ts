// ABOUTME: API endpoint for equipment request management operations
// ABOUTME: Handles POST requests for creating new equipment requests

import { z } from "zod";
import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requestSchemas, InputSanitizer, ValidationHelper } from "@/lib/validation";
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

export async function GET(request: NextRequest) {
  return withSecurity(request, async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      
      // Validate and sanitize search parameters
      const validatedParams = ValidationHelper.validateSearchParams(searchParams);
      
      const status = validatedParams.status;
      const userId = validatedParams.owner;
      const needsApproval = searchParams.get("needsApproval") === "true";
      const user = req.user;

    const whereClause: Record<string, unknown> = {};

    // Filter by status if provided
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Regular users can only see their own requests
    if (user?.role === "user") {
      whereClause.requesterId = user.id;
    } else if (userId) {
      whereClause.requesterId = userId;
    }

    // For team leads/admins, filter for requests needing their approval
    if (needsApproval && user?.role !== "user") {
      if (user?.role === "team_lead") {
        whereClause.status = "pending";
        whereClause.teamLeadApproval = null;
      } else if (user?.role === "admin") {
        whereClause.status = "pending";
        whereClause.teamLeadApproval = true;
        whereClause.adminApproval = null;
      }
    }

    const requests = await db.equipmentRequest.findMany({
      where: whereClause,
      include: {
        requester: {
          select: { id: true, name: true, email: true, role: true },
        },
        approver: {
          select: { id: true, name: true, email: true, role: true },
        },
        equipment: {
          select: { id: true, name: true, serialNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Sanitize the response data
    const sanitizedRequests = ValidationHelper.sanitizeDbResults(requests);

    return NextResponse.json(sanitizedRequests);
  } catch (error) {
    console.error("Requests fetch error:", error);
    
    // Handle validation errors specifically
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json(
        { error: error.message },
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

export async function POST(request: NextRequest) {
  return withSecurity(request, async (req: AuthenticatedRequest) => {
    try {
      const user = req.user;
      const body = await req.json();
      
      // Validate and sanitize input
      const validatedData = requestSchemas.create.parse(body);
      const sanitizedData = {
        equipmentType: InputSanitizer.sanitizeString(validatedData.equipmentType),
        justification: InputSanitizer.sanitizeString(validatedData.justification),
        priority: validatedData.priority,
        specificRequirements: validatedData.specificRequirements 
          ? InputSanitizer.sanitizeString(validatedData.specificRequirements) 
          : undefined,
        budget: validatedData.budget,
        neededBy: validatedData.neededBy,
      };

      // Create equipment request
      const equipmentRequest = await db.equipmentRequest.create({
        data: {
          requesterId: user?.id || '',
          ...sanitizedData,
          status: "pending",
        },
        include: {
          requester: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      // Log request creation in audit trail
      try {
        await RequestHistoryService.logRequestCreation(
          equipmentRequest.id,
          user?.id || '',
          sanitizedData.equipmentType
        );
      } catch (historyError) {
        console.error('Failed to log request creation history:', historyError);
        // Don't fail the request creation if history logging fails
      }

      // Send notification email to team leads
      try {
        const emailData: EquipmentRequestEmailData = {
          id: equipmentRequest.id,
          equipmentType: equipmentRequest.equipmentType,
          justification: equipmentRequest.justification,
          priority: equipmentRequest.priority,
          neededBy: equipmentRequest.neededBy || undefined,
          budget: equipmentRequest.budget || undefined,
          specificRequirements: equipmentRequest.specificRequirements || undefined,
          status: equipmentRequest.status,
          requester: {
            id: equipmentRequest.requester.id,
            name: equipmentRequest.requester.name,
            email: equipmentRequest.requester.email,
            role: equipmentRequest.requester.role as any,
          },
          createdAt: equipmentRequest.createdAt,
          updatedAt: equipmentRequest.updatedAt,
        };

        const teamLeadEmails = await EmailNotificationService.getTeamLeadEmails(user?.id || '');
        if (teamLeadEmails.length > 0) {
          await EmailNotificationService.notifyTeamLeadOfNewRequest(emailData, teamLeadEmails);
        }
      } catch (emailError) {
        console.error('Failed to send team lead notification:', emailError);
        // Don't fail the request creation if email fails
      }

      return NextResponse.json(
        {
          message: "Equipment request created successfully",
          id: equipmentRequest.id,
          request: equipmentRequest,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Request creation error:", error);

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
