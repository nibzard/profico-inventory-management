// ABOUTME: API endpoint for retrieving request history and audit trail
// ABOUTME: Handles GET requests for request history with pagination and filtering

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { withSecurity } from "@/lib/security-middleware";
import { RequestHistoryService } from "@/lib/request-history";

interface AuthenticatedRequest extends NextRequest {
  user?: {
    id?: string;
    name?: string;
    role?: string;
  };
}

const historyQuerySchema = z.object({
  requestId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
});

export async function GET(request: NextRequest) {
  return withSecurity(request, async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const user = req.user;
      
      // Validate and parse query parameters
      const validatedParams = historyQuerySchema.parse({
        requestId: searchParams.get("requestId"),
        userId: searchParams.get("userId"),
        action: searchParams.get("action"),
        limit: searchParams.get("limit"),
        offset: searchParams.get("offset"),
      });

      // Check permissions for accessing history
      if (validatedParams.requestId) {
        // Users can only view history for their own requests unless they're team leads or admins
        if (user?.role === "user") {
          const request = await db.equipmentRequest.findUnique({
            where: { id: validatedParams.requestId },
            select: { requesterId: true },
          });

          if (!request || request.requesterId !== user.id) {
            return NextResponse.json(
              { error: "Forbidden - you can only view history for your own requests" },
              { status: 403 }
            );
          }
        }
      } else if (validatedParams.userId && validatedParams.userId !== user?.id) {
        // Users can only view their own history unless they're team leads or admins
        if (user?.role === "user") {
          return NextResponse.json(
            { error: "Forbidden - you can only view your own history" },
            { status: 403 }
          );
        }
      }

      let history;
      let total;

      if (validatedParams.requestId) {
        // Get history for a specific request
        history = await RequestHistoryService.getRequestHistory(validatedParams.requestId);
        total = history.length;
      } else if (validatedParams.userId) {
        // Get history for a specific user
        history = await RequestHistoryService.getUserHistory(validatedParams.userId, validatedParams.limit);
        total = history.length;
      } else if (user?.role === "admin" || user?.role === "team_lead") {
        // Admins and team leads can view recent system-wide history
        history = await RequestHistoryService.getRecentHistory(validatedParams.limit);
        total = history.length;
      } else {
        // Regular users can view their own recent history
        history = await RequestHistoryService.getUserHistory(user.id, validatedParams.limit);
        total = history.length;
      }

      // Apply pagination
      const paginatedHistory = history.slice(validatedParams.offset, validatedParams.offset + validatedParams.limit);

      return NextResponse.json({
        history: paginatedHistory,
        pagination: {
          total,
          limit: validatedParams.limit,
          offset: validatedParams.offset,
          hasMore: validatedParams.offset + validatedParams.limit < total,
        },
      });

    } catch (error) {
      console.error("Request history fetch error:", error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: error.issues },
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