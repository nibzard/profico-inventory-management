// ABOUTME: API endpoint for equipment tags management
// ABOUTME: Handles CRUD operations for equipment tags with usage tracking

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

const tagSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name too long"),
  description: z.string().max(200, "Description too long").optional(),
  color: z.string().min(4, "Color is required"),
});

// GET /api/equipment/tags - List all tags
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tags = await db.equipmentTag.findMany({
      include: {
        _count: {
          select: {
            equipment: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedTags = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      color: tag.color,
      usageCount: tag._count.equipment,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }));

    return NextResponse.json(formattedTags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/equipment/tags - Create new tag
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role === "user") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = tagSchema.parse(body);

    // Check if tag with same name already exists
    const existingTag = await db.equipmentTag.findUnique({
      where: { name: validatedData.name },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: "Tag with this name already exists" },
        { status: 400 }
      );
    }

    const tag = await db.equipmentTag.create({
      data: validatedData,
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}