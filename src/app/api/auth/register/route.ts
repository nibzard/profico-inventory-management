// ABOUTME: User registration API endpoint for ProfiCo Inventory Management System
// ABOUTME: Handles new user account creation with email/password and role assignment

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { userSchemas, InputSanitizer, ValidationHelper } from "@/lib/validation";
import { withSecurity } from "@/lib/security-middleware";

async function registerHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = userSchemas.create.parse(body);

    // Sanitize inputs
    const { name, email, password, role } = {
      name: InputSanitizer.sanitizeString(validatedData.name),
      email: InputSanitizer.sanitizeEmail(validatedData.email),
      password: validatedData.password, // Don't sanitize password - it will be hashed
      role: validatedData.role,
    };

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: "User created successfully", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

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

export async function POST(req: NextRequest) {
  return withSecurity(req, registerHandler, {
    requireAuth: false,
    enableRateLimit: true,
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 5, // Limit registration attempts
  });
}
