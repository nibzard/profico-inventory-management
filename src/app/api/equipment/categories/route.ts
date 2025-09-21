// ABOUTME: API endpoint for equipment categories management
// ABOUTME: Handles CRUD operations for equipment categories with usage tracking

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name too long"),
  description: z.string().max(200, "Description too long").optional(),
  color: z.string().min(4, "Color is required"),
  icon: z.string().min(1, "Icon is required"),
});

// GET /api/equipment/categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await db.equipmentCategory.findMany({
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

    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      equipmentCount: category._count.equipment,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));

    return NextResponse.json(formattedCategories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/equipment/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role === "user") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = categorySchema.parse(body);

    // Check if category with same name already exists
    const existingCategory = await db.equipmentCategory.findUnique({
      where: { name: validatedData.name },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 400 }
      );
    }

    const category = await db.equipmentCategory.create({
      data: validatedData,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);

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