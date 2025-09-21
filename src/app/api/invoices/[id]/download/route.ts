import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await db.subscriptionInvoice.findUnique({
      where: { id },
      include: {
        subscription: {
          select: {
            id: true,
            softwareName: true,
            assignedUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check role-based access
    if (session.user.role === "user" && invoice.subscription.assignedUser.id !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!invoice.invoiceUrl) {
      return NextResponse.json({ error: "Invoice file not found" }, { status: 404 });
    }

    const filePath = join(process.cwd(), "public", invoice.invoiceUrl);
    
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "Invoice file not found on disk" }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const fileName = invoice.fileName || `invoice-${invoice.id}`;

    return new NextResponse(fileBuffer as any, {
      headers: {
        "Content-Type": invoice.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error downloading invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}