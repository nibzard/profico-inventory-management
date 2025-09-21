// ABOUTME: API endpoint for downloading CSV import template
// ABOUTME: Provides standardized template for bulk equipment import

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to import
    if (!["admin", "team_lead"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // CSV template with all required and optional fields
    const template = [
      "name,serialNumber,category,brand,model,purchaseDate,purchasePrice,purchaseMethod,condition,location,warrantyExpiry,notes",
      "MacBook Pro 16,MBP001,laptop,Apple,MacBook Pro 16,2024-01-15,2500,profico,excellent,Office A,2026-01-15,Company laptop for development",
      "Dell Monitor,MON001,monitor,Dell,U2720Q,2024-01-15,400,profico,good,Office A,2026-01-15,4K monitor for workstation",
      "iPhone 15,IP001,phone,Apple,iPhone 15,2024-01-15,1000,profico,excellent,Mobile,2025-01-15,Company phone"
    ].join('\n');

    return new NextResponse(template, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=equipment-import-template.csv",
      },
    });
  } catch (error) {
    console.error("Template download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}