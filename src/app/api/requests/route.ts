// ABOUTME: API endpoint for equipment request management operations
// ABOUTME: Handles POST requests for creating new equipment requests

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createRequestSchema = z.object({
  equipmentType: z
    .string()
    .min(2, "Equipment type must be at least 2 characters"),
  category: z.string(),
  justification: z
    .string()
    .min(20, "Justification must be at least 20 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  specificRequirements: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const needsApproval = searchParams.get("needsApproval") === "true";

    const whereClause: Record<string, unknown> = {};

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    // Regular users can only see their own requests
    if (session.user.role === "user") {
      whereClause.requesterId = session.user.id;
    } else if (userId) {
      whereClause.requesterId = userId;
    }

    // For team leads/admins, filter for requests needing their approval
    if (needsApproval && session.user.role !== "user") {
      if (session.user.role === "team_lead") {
        whereClause.status = "pending";
        whereClause.teamLeadApproval = null;
      } else if (session.user.role === "admin") {
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

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Requests fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createRequestSchema.parse(body);

    // Create equipment request
    const equipmentRequest = await db.equipmentRequest.create({
      data: {
        requesterId: session.user.id,
        equipmentType: validatedData.equipmentType,
        justification: validatedData.justification,
        priority: validatedData.priority,
        status: "pending",
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // TODO: Send notification email to team lead

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
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
