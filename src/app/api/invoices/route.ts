import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const subscriptionId = searchParams.get("subscriptionId");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Apply role-based filtering
    if (session.user.role === "user") {
      // Users can only see invoices for their subscriptions
      where.subscription = {
        assignedUserId: session.user.id,
      };
    }

    // Apply filters
    if (status) {
      where.status = status;
    }

    if (subscriptionId) {
      where.subscriptionId = subscriptionId;
    }

    const [invoices, total] = await Promise.all([
      db.subscriptionInvoice.findMany({
        where,
        include: {
          subscription: {
            select: {
              id: true,
              softwareName: true,
              vendor: true,
              assignedUser: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { dueDate: "desc" },
        skip,
        take: limit,
      }),
      db.subscriptionInvoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "team_lead")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const subscriptionId = formData.get("subscriptionId") as string;
    const vendor = formData.get("vendor") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const dueDate = formData.get("dueDate") as string;
    const invoiceNumber = formData.get("invoiceNumber") as string;
    const description = formData.get("description") as string;

    // Validate required fields
    if (!file || !subscriptionId || !vendor || isNaN(amount) || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify subscription exists and user has access
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "uploads", "invoices");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}-${subscriptionId}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create invoice record in database
    const invoice = await db.subscriptionInvoice.create({
      data: {
        subscriptionId,
        vendor,
        amount,
        dueDate: new Date(dueDate),
        status: "pending",
        invoiceNumber: invoiceNumber || null,
        description: description || null,
        invoiceUrl: `/uploads/invoices/${fileName}`,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      },
      include: {
        subscription: {
          select: {
            id: true,
            softwareName: true,
            vendor: true,
            assignedUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}