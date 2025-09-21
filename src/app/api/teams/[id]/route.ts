// ABOUTME: Individual team API endpoint for GET, PUT, and DELETE operations
// ABOUTME: Handles team retrieval, updates, and deletion

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { teamSchemas, InputSanitizer } from "@/lib/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions - only admin and team_lead can view team details
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const team = await db.team.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Add member counts to response
    const teamWithCounts = {
      ...team,
      memberCount: team.members?.length || 0,
      activeMemberCount: team.members?.filter(m => m.isActive).length || 0,
    };

    return NextResponse.json(teamWithCounts);
  } catch (error) {
    console.error("Team fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update teams
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate and sanitize input
    const validatedData = teamSchemas.update.parse(body);
    const sanitizedData = {
      ...(validatedData.name && { name: InputSanitizer.sanitizeString(validatedData.name) }),
      ...(validatedData.leaderId !== undefined && { leaderId: validatedData.leaderId || null }),
    };

    // Check if name is being changed and already exists
    if (validatedData.name) {
      const existingTeam = await db.team.findUnique({
        where: { name: validatedData.name }
      });

      if (existingTeam && existingTeam.id !== id) {
        return NextResponse.json(
          { error: "Team with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Update the team
    const updatedTeam = await db.team.update({
      where: { id },
      data: sanitizedData,
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
          where: { isActive: true },
        },
      },
    });

    // Add member counts to response
    const teamWithCounts = {
      ...updatedTeam,
      memberCount: updatedTeam.members?.length || 0,
      activeMemberCount: updatedTeam.members?.filter(m => m.isActive).length || 0,
    };

    return NextResponse.json({
      message: "Team updated successfully",
      team: teamWithCounts
    });

  } catch (error) {
    console.error("Team update error:", error);

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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete teams
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if team exists and has members
    const team = await db.team.findUnique({
      where: { id },
      include: {
        members: {
          select: { id: true },
          where: { isActive: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.members.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete team with active members. Please reassign or deactivate members first." },
        { status: 400 }
      );
    }

    // Delete the team
    await db.team.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Team deleted successfully"
    });

  } catch (error) {
    console.error("Team deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}