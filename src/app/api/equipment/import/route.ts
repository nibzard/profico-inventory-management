// ABOUTME: API endpoint for bulk equipment import from CSV data
// ABOUTME: Validates and creates equipment records with proper error handling

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for equipment import
const importEquipmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  category: z.enum([
    "laptop", "desktop", "monitor", "phone", "tablet", "printer", 
    "scanner", "server", "networking", "storage", "other"
  ]),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  purchaseDate: z.string().optional().transform((val) => {
    if (!val) return new Date();
    const date = new Date(val);
    return isNaN(date.getTime()) ? new Date() : date;
  }),
  purchasePrice: z.string().optional().transform((val) => {
    if (!val) return 0;
    const price = parseFloat(val);
    return isNaN(price) ? 0 : price;
  }),
  purchaseMethod: z.enum(["profico", "zopi", "leasing", "off_the_shelf"]).optional().default("profico"),
  condition: z.enum(["excellent", "good", "fair", "poor"]).optional().default("good"),
  location: z.string().optional(),
  warrantyExpiry: z.string().optional().transform((val) => {
    if (!val) return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!["admin", "team_lead"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data } = await request.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const results = {
      success: [] as any[],
      errors: [] as string[],
      successCount: 0,
    };

    // Process each equipment item
    for (const [index, item] of data.entries()) {
      try {
        // Validate the item
        const validatedItem = importEquipmentSchema.parse(item);
        
        // Check if serial number already exists
        const existingEquipment = await db.equipment.findUnique({
          where: { serialNumber: validatedItem.serialNumber },
        });

        if (existingEquipment) {
          results.errors.push(
            `Row ${item.lineNumber || index + 1}: Equipment with serial number "${validatedItem.serialNumber}" already exists`
          );
          continue;
        }

        // Create the equipment
        const equipment = await db.equipment.create({
          data: {
            name: validatedItem.name,
            serialNumber: validatedItem.serialNumber,
            category: validatedItem.category,
            brand: validatedItem.brand,
            model: validatedItem.model,
            purchaseDate: validatedItem.purchaseDate,
            purchasePrice: validatedItem.purchasePrice,
            purchaseMethod: validatedItem.purchaseMethod,
            condition: validatedItem.condition,
            location: validatedItem.location,
            warrantyExpiry: validatedItem.warrantyExpiry,
            notes: validatedItem.notes,
            status: "available", // Default status for imported equipment
            createdBy: session.user.id,
          },
        });

        results.success.push({
          row: item.lineNumber || index + 1,
          id: equipment.id,
          name: equipment.name,
          serialNumber: equipment.serialNumber,
        });
        results.successCount++;

      } catch (error) {
        let errorMessage = "Unknown error";
        
        if (error instanceof z.ZodError) {
          errorMessage = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        results.errors.push(
          `Row ${item.lineNumber || index + 1}: ${errorMessage}`
        );
      }
    }

    // Return results
    return NextResponse.json({
      message: `Import completed. ${results.successCount} items created, ${results.errors.length} errors.`,
      successCount: results.successCount,
      errorCount: results.errors.length,
      success: results.success,
      errors: results.errors,
    });

  } catch (error) {
    console.error("Equipment import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}