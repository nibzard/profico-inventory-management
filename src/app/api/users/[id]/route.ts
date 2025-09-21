// ABOUTME: Individual user API endpoint for GET, PUT, and DELETE operations
// ABOUTME: Handles user retrieval, updates, and deactivation

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { userSchemas, InputSanitizer } from "@/lib/validation";

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

    // Check permissions - only admin and team_lead can view user details
    if (session.user.role === "user" && session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        ownedEquipment: {
          where: { status: "assigned" },
          select: { id: true, name: true, serialNumber: true },
        },
        equipmentRequests: {
          select: { id: true, status: true, equipmentType: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add counts for dashboard
    const userWithCounts = {
      ...user,
      equipmentCount: user.ownedEquipment.length,
      pendingRequestsCount: user.equipmentRequests.filter(r => r.status === "pending").length,
    };

    return NextResponse.json(userWithCounts);
  } catch (error) {
    console.error("User fetch error:", error);
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

    // Only admins can update users
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate and sanitize input
    const validatedData = userSchemas.update.parse(body);
    const sanitizedData = {
      ...(validatedData.name && { name: InputSanitizer.sanitizeString(validatedData.name) }),
      ...(validatedData.email && { email: InputSanitizer.sanitizeEmail(validatedData.email) }),
      ...(validatedData.role && { role: validatedData.role }),
      ...(validatedData.teamId !== undefined && { teamId: validatedData.teamId || null }),
      ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
    };

    // Check if email is being changed and already exists
    if (validatedData.email) {
      const existingUser = await db.user.findUnique({
        where: { email: validatedData.email }
      });

      if (existingUser && existingUser.id !== id) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Update the user
    const updatedUser = await db.user.update({
      where: { id },
      data: sanitizedData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
        teamId: true,
      }
    });

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("User update error:", error);

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

    // Only admins can deactivate users
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent deactivating the last admin
    const userToDeactivate = await db.user.findUnique({
      where: { id },
      select: { role: true }
    });

    if (!userToDeactivate) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (userToDeactivate.role === "admin") {
      const adminCount = await db.user.count({
        where: { role: "admin", isActive: true }
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot deactivate the last administrator" },
          { status: 400 }
        );
      }
    }

    // Deactivate the user (soft delete)
    await db.user.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({
      message: "User deactivated successfully"
    });

  } catch (error) {
    console.error("User deactivation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}