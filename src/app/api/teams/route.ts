// ABOUTME: Teams API endpoint for team management operations
// ABOUTME: Handles GET requests for team listing and POST for creating teams

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { teamSchemas, InputSanitizer } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions - only admin and team_lead can view teams
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeMembers = searchParams.get("includeMembers") === "true";

    const teams = await db.team.findMany({
      include: includeMembers ? {
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
      } : false,
      orderBy: { name: "asc" },
    });

    // Add member counts to response
    const teamsWithCounts = teams.map((team) => ({
      ...team,
      memberCount: team.members?.length || 0,
      activeMemberCount: team.members?.filter(m => m.isActive).length || 0,
      members: includeMembers ? team.members : undefined,
    }));

    return NextResponse.json(teamsWithCounts);
  } catch (error) {
    console.error("Teams fetch error:", error);
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

    // Only admins can create teams
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate and sanitize input
    const validatedData = teamSchemas.create.parse(body);
    const sanitizedData = {
      name: InputSanitizer.sanitizeString(validatedData.name),
      leaderId: validatedData.leaderId || null,
    };

    // Check if team already exists
    const existingTeam = await db.team.findUnique({
      where: { name: sanitizedData.name }
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: "Team with this name already exists" },
        { status: 400 }
      );
    }

    // Create the team
    const newTeam = await db.team.create({
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
      ...newTeam,
      memberCount: newTeam.members?.length || 0,
      activeMemberCount: newTeam.members?.filter(m => m.isActive).length || 0,
    };

    return NextResponse.json({
      message: "Team created successfully",
      team: teamWithCounts
    }, { status: 201 });

  } catch (error) {
    console.error("Team creation error:", error);

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