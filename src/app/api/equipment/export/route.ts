// ABOUTME: API endpoint for exporting equipment data to Excel format
// ABOUTME: Handles bulk equipment data export with filtering and formatting

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");
    const equipmentIds = ids ? ids.split(",") : [];

    // Build query with filters
    const whereClause: any = {};
    if (equipmentIds.length > 0) {
      whereClause.id = { in: equipmentIds };
    }

    // Fetch equipment with related data
    const equipment = await db.equipment.findMany({
      where: whereClause,
      include: {
        currentOwner: {
          select: { id: true, name: true, email: true },
        },
        categoryObj: {
          select: { id: true, name: true, color: true },
        },
        tags: {
          select: { id: true, name: true, color: true },
        },
        maintenanceRecords: {
          select: { id: true, date: true, type: true, cost: true, status: true },
          orderBy: { date: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Transform data for export
    const exportData = equipment.map((item) => ({
      "Serial Number": item.serialNumber,
      "Name": item.name,
      "Brand": item.brand || "",
      "Model": item.model || "",
      "Category": item.categoryObj?.name || item.category,
      "Status": item.status,
      "Condition": item.condition || "",
      "Current Owner": item.currentOwner?.name || "",
      "Owner Email": item.currentOwner?.email || "",
      "Location": item.location || "",
      "Purchase Date": item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : "",
      "Purchase Method": item.purchaseMethod || "",
      "Purchase Price": item.purchasePrice || 0,
      "Warranty Expiry": item.warrantyExpiry ? new Date(item.warrantyExpiry).toLocaleDateString() : "",
      "Last Maintenance": item.maintenanceRecords[0]?.date ? new Date(item.maintenanceRecords[0].date).toLocaleDateString() : "",
      "Maintenance Cost": item.maintenanceRecords[0]?.cost || 0,
      "Tags": item.tags.map((tag) => tag.name).join(", "),
      "Notes": item.notes || "",
      "Created": item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
      "Updated": item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "",
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Equipment");

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Serial Number
      { wch: 30 }, // Name
      { wch: 15 }, // Brand
      { wch: 20 }, // Model
      { wch: 15 }, // Category
      { wch: 12 }, // Status
      { wch: 10 }, // Condition
      { wch: 25 }, // Current Owner
      { wch: 30 }, // Owner Email
      { wch: 15 }, // Location
      { wch: 12 }, // Purchase Date
      { wch: 15 }, // Purchase Method
      { wch: 12 }, // Purchase Price
      { wch: 15 }, // Warranty Expiry
      { wch: 15 }, // Last Maintenance
      { wch: 12 }, // Maintenance Cost
      { wch: 30 }, // Tags
      { wch: 50 }, // Notes
      { wch: 12 }, // Created
      { wch: 12 }, // Updated
    ];
    ws["!cols"] = colWidths;

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    // Return as file download
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="equipment-export-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Equipment export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}