// ABOUTME: API endpoint for generating bulk QR codes for multiple equipment items
// ABOUTME: Creates a PDF document with QR codes and equipment information

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import jsPDF from "jspdf";
import QRCode from "qrcode";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { equipmentIds } = await request.json();
    
    if (!Array.isArray(equipmentIds) || equipmentIds.length === 0) {
      return NextResponse.json({ error: "No equipment IDs provided" }, { status: 400 });
    }

    // Fetch equipment data
    const equipment = await db.equipment.findMany({
      where: {
        id: { in: equipmentIds },
      },
      include: {
        currentOwner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { name: "asc" },
    });

    if (equipment.length === 0) {
      return NextResponse.json({ error: "No equipment found" }, { status: 404 });
    }

    // Create PDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const qrSize = 80;
    const itemHeight = 110; // Height per equipment item
    const itemsPerPage = Math.floor((pageHeight - 2 * margin) / itemHeight);

    // PDF title
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Equipment QR Codes", pageWidth / 2, margin, { align: "center" });

    let currentY = margin + 20;
    let itemCount = 0;

    for (const item of equipment) {
      // Check if we need a new page
      if (itemCount > 0 && itemCount % itemsPerPage === 0) {
        pdf.addPage();
        currentY = margin;
      }

      try {
        // Generate QR code data URL
        const qrUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/equipment/${item.id}`;
        const qrDataURL = await QRCode.toDataURL(qrUrl, {
          errorCorrectionLevel: 'H',
          width: qrSize * 2, // Higher resolution for PDF
          margin: 1,
        });

        // Add QR code image to PDF
        pdf.addImage(qrDataURL, 'PNG', margin, currentY, qrSize, qrSize);

        // Add equipment information next to QR code
        const textX = margin + qrSize + 15;
        let textY = currentY + 15;

        // Equipment name
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(item.name, textX, textY);
        textY += 8;

        // Brand and model
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const brandModel = `${item.brand || ''} ${item.model || ''}`.trim();
        if (brandModel) {
          pdf.text(brandModel, textX, textY);
          textY += 6;
        }

        // Serial number
        pdf.setFont("helvetica", "bold");
        pdf.text("Serial: ", textX, textY);
        pdf.setFont("helvetica", "normal");
        pdf.text(item.serialNumber, textX + 25, textY);
        textY += 6;

        // Category
        pdf.text(`Category: ${item.category.replace("_", " ")}`, textX, textY);
        textY += 6;

        // Status
        const statusColor = getStatusColor(item.status);
        pdf.setTextColor(statusColor.r, statusColor.g, statusColor.b);
        pdf.text(`Status: ${item.status.toUpperCase()}`, textX, textY);
        pdf.setTextColor(0, 0, 0); // Reset to black
        textY += 6;

        // Current owner
        if (item.currentOwner) {
          pdf.text(`Assigned to: ${item.currentOwner.name}`, textX, textY);
          textY += 6;
        }

        // Purchase date
        if (item.purchaseDate) {
          const purchaseDate = new Date(item.purchaseDate).toLocaleDateString();
          pdf.text(`Purchase Date: ${purchaseDate}`, textX, textY);
        }

        // Add a separator line
        if (itemCount < equipment.length - 1) {
          const lineY = currentY + qrSize + 5;
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, lineY, pageWidth - margin, lineY);
        }

        currentY += itemHeight;
        itemCount++;

      } catch (error) {
        console.error(`Error generating QR code for equipment ${item.id}:`, error);
        // Skip this item and continue
        continue;
      }
    }

    // Add footer with generation info
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Generated on ${new Date().toLocaleString()} | Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Convert PDF to buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="equipment-qr-codes-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Bulk QR generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getStatusColor(status: string): { r: number; g: number; b: number } {
  switch (status) {
    case 'available':
      return { r: 34, g: 197, b: 94 }; // Green
    case 'assigned':
      return { r: 59, g: 130, b: 246 }; // Blue
    case 'maintenance':
      return { r: 245, g: 158, b: 11 }; // Yellow
    case 'broken':
      return { r: 239, g: 68, b: 68 }; // Red
    case 'decommissioned':
      return { r: 107, g: 114, b: 128 }; // Gray
    default:
      return { r: 0, g: 0, b: 0 }; // Black
  }
}