// ABOUTME: API endpoint for user management operations
// ABOUTME: Handles GET requests for user listing with filtering options

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const includeTeam = searchParams.get("includeTeam") === "true";

    // Check permissions - only admin and team_lead can view all users
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await db.user.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        teamId: true,
        team: includeTeam
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
        ownedEquipment: {
          where: { status: "assigned" },
          select: { id: true },
        },
        equipmentRequests: {
          where: { status: "pending" },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Add counts to response
    const usersWithCounts = users.map((user) => ({
      ...user,
      equipmentCount: user.ownedEquipment.length,
      pendingRequestsCount: user.equipmentRequests.length,
      ownedEquipment: undefined, // Remove from response
      equipmentRequests: undefined, // Remove from response
    }));

    return NextResponse.json(usersWithCounts);
  } catch (error) {
    console.error("Users fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
