import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { subscriptionSchemas, InputSanitizer } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");
    const vendor = searchParams.get("vendor");
    const billingFrequency = searchParams.get("billingFrequency");
    const paymentMethod = searchParams.get("paymentMethod");
    const isActive = searchParams.get("isActive");
    const isReimbursement = searchParams.get("isReimbursement");
    const renewalDateFrom = searchParams.get("renewalDateFrom");
    const renewalDateTo = searchParams.get("renewalDateTo");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Apply role-based filtering
    if (session.user.role === "user") {
      where.assignedUserId = session.user.id;
    }

    // Apply search filters
    if (search) {
      where.OR = [
        { softwareName: { contains: search, mode: "insensitive" } },
        { vendor: { contains: search, mode: "insensitive" } },
        { licenseKey: { contains: search, mode: "insensitive" } },
      ];
    }

    if (vendor) {
      where.vendor = { contains: vendor, mode: "insensitive" };
    }

    if (billingFrequency) {
      where.billingFrequency = billingFrequency;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    if (isReimbursement !== null) {
      where.isReimbursement = isReimbursement === "true";
    }

    if (renewalDateFrom) {
      where.renewalDate = { gte: new Date(renewalDateFrom) };
    }

    if (renewalDateTo) {
      where.renewalDate = { ...where.renewalDate, lte: new Date(renewalDateTo) };
    }

    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where,
        include: {
          assignedUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { renewalDate: "asc" },
        skip,
        take: limit,
      }),
      db.subscription.count({ where }),
    ]);

    // Sanitize results
    const sanitizedSubscriptions = subscriptions.map(sub => ({
      ...sub,
      softwareName: InputSanitizer.sanitizeString(sub.softwareName),
      vendor: sub.vendor ? InputSanitizer.sanitizeString(sub.vendor) : null,
      licenseKey: sub.licenseKey ? InputSanitizer.sanitizeString(sub.licenseKey) : null,
      notes: sub.notes ? InputSanitizer.sanitizeString(sub.notes) : null,
    }));

    return NextResponse.json({
      subscriptions: sanitizedSubscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
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

    const body = await request.json();
    const validatedData = subscriptionSchemas.create.parse(body);

    // Sanitize inputs
    const sanitizedData = {
      softwareName: InputSanitizer.sanitizeString(validatedData.softwareName),
      assignedUserId: validatedData.assignedUserId,
      assignedUserEmail: InputSanitizer.sanitizeEmail(validatedData.assignedUserEmail),
      price: validatedData.price,
      billingFrequency: validatedData.billingFrequency,
      paymentMethod: validatedData.paymentMethod,
      invoiceRecipient: InputSanitizer.sanitizeEmail(validatedData.invoiceRecipient),
      isReimbursement: validatedData.isReimbursement,
      isActive: validatedData.isActive,
      renewalDate: validatedData.renewalDate,
      vendor: validatedData.vendor ? InputSanitizer.sanitizeString(validatedData.vendor) : null,
      licenseKey: validatedData.licenseKey ? InputSanitizer.sanitizeString(validatedData.licenseKey) : null,
      notes: validatedData.notes ? InputSanitizer.sanitizeString(validatedData.notes) : null,
    };

    const subscription = await db.subscription.create({
      data: sanitizedData,
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      );
    }

    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}