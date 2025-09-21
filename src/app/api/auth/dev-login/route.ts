// ABOUTME: Development authentication bypass API route
// ABOUTME: Provides instant admin login when DEVELOPMENT=true
// ABOUTME: SECURITY WARNING: This is for development only and should never be available in production

import { NextRequest, NextResponse } from "next/server";
import { isDevelopmentBypassEnabled, ensureDevelopmentUser } from "@/lib/dev-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  // Only allow in development mode
  if (!isDevelopmentBypassEnabled()) {
    return NextResponse.json(
      { error: "Development login is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    // Ensure development user exists in database
    const devUser = await ensureDevelopmentUser(prisma);
    
    if (!devUser) {
      return NextResponse.json(
        { error: "Failed to create development user" },
        { status: 500 }
      );
    }

    // Return success response with user info
    return NextResponse.json({
      success: true,
      message: "Development login successful",
      user: {
        id: devUser.id,
        email: devUser.email,
        name: devUser.name,
        role: devUser.role,
      },
    });
  } catch (error) {
    console.error("Development login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Check if development mode is enabled
  const isEnabled = isDevelopmentBypassEnabled();
  
  return NextResponse.json({
    developmentMode: isEnabled,
    message: isEnabled 
      ? "Development authentication bypass is enabled" 
      : "Development authentication bypass is disabled",
  });
}