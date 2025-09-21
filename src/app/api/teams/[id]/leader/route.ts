// ABOUTME: Team lead assignment API endpoint
// ABOUTME: Handles PUT requests for assigning/removing team leads

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const assignLeaderSchema = z.object({
  leaderId: z.string().cuid().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can assign team leads
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = assignLeaderSchema.parse(body);

    // Check if team exists
    const team = await db.team.findUnique({
      where: { id },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // If leaderId is provided, check if user exists and has appropriate role
    if (validatedData.leaderId) {
      const user = await db.user.findUnique({
        where: { id: validatedData.leaderId },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (user.role !== "admin" && user.role !== "team_lead") {
        return NextResponse.json(
          { error: "User must be an admin or team lead to be assigned as team lead" },
          { status: 400 }
        );
      }

      if (!user.isActive) {
        return NextResponse.json(
          { error: "Cannot assign an inactive user as team lead" },
          { status: 400 }
        );
      }
    }

    // Update the team lead
    const updatedTeam = await db.team.update({
      where: { id },
      data: {
        leaderId: validatedData.leaderId || null,
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: validatedData.leaderId ? "Team lead assigned successfully" : "Team lead removed successfully",
      team: updatedTeam,
    });

  } catch (error) {
    console.error("Team lead assignment error:", error);

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
}