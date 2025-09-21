import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";

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

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Apply role-based filtering
    if (session.user.role === "user") {
      // Users can only see payments for their subscriptions
      where.invoice = {
        subscription: {
          assignedUserId: session.user.id,
        },
      };
    }

    // Apply filters
    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          invoice: {
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
          },
        },
        orderBy: { processedAt: "desc" },
        skip,
        take: limit,
      }),
      db.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
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

    const { invoiceId, amount, paymentMethod, transactionId, notes } = await request.json();

    // Validate required fields
    if (!invoiceId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify invoice exists and user has access
    const invoice = await db.subscriptionInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        subscription: {
          include: {
            assignedUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Create payment record
    const payment = await db.payment.create({
      data: {
        invoiceId,
        amount,
        paymentMethod,
        transactionId,
        notes,
        status: "completed",
        processedById: session.user.id,
        processedAt: new Date(),
      },
      include: {
        invoice: {
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
        },
      },
    });

    // Update invoice status
    await db.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: { status: "paid" },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}