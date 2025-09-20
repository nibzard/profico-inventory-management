// ABOUTME: API endpoint for user profile management operations
// ABOUTME: Handles GET and PATCH requests for user profile data

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  image: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        team: true,
        ownedEquipment: {
          where: { status: "assigned" },
          select: { id: true, name: true, serialNumber: true, category: true },
        },
        equipmentRequests: {
          where: { status: { in: ["pending", "approved"] } },
          select: {
            id: true,
            equipmentType: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Check if email is being changed and if it's already taken
    if (validatedData.email !== session.user.email) {
      const existingUser = await db.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { error: "Email address is already in use" },
          { status: 400 }
        );
      }
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: validatedData.name,
        email: validatedData.email,
        image: validatedData.image || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);

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
