import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { subscriptionSchemas, InputSanitizer } from "@/lib/validation";

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

    const subscription = await db.subscription.findUnique({
      where: { id },
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Check role-based access
    if (session.user.role === "user" && subscription.assignedUserId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Sanitize output
    const sanitizedSubscription = {
      ...subscription,
      softwareName: InputSanitizer.sanitizeString(subscription.softwareName),
      vendor: subscription.vendor ? InputSanitizer.sanitizeString(subscription.vendor) : null,
      licenseKey: subscription.licenseKey ? InputSanitizer.sanitizeString(subscription.licenseKey) : null,
      notes: subscription.notes ? InputSanitizer.sanitizeString(subscription.notes) : null,
    };

    return NextResponse.json(sanitizedSubscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "team_lead")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingSubscription = await db.subscription.findUnique({
      where: { id },
    });

    if (!existingSubscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = subscriptionSchemas.update.parse(body);

    // Sanitize inputs
    const sanitizedData = {
      ...(validatedData.softwareName && { softwareName: InputSanitizer.sanitizeString(validatedData.softwareName) }),
      ...(validatedData.assignedUserId && { assignedUserId: validatedData.assignedUserId }),
      ...(validatedData.assignedUserEmail && { assignedUserEmail: InputSanitizer.sanitizeEmail(validatedData.assignedUserEmail) }),
      ...(validatedData.price !== undefined && { price: validatedData.price }),
      ...(validatedData.billingFrequency && { billingFrequency: validatedData.billingFrequency }),
      ...(validatedData.paymentMethod && { paymentMethod: validatedData.paymentMethod }),
      ...(validatedData.invoiceRecipient && { invoiceRecipient: InputSanitizer.sanitizeEmail(validatedData.invoiceRecipient) }),
      ...(validatedData.isReimbursement !== undefined && { isReimbursement: validatedData.isReimbursement }),
      ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      ...(validatedData.renewalDate && { renewalDate: validatedData.renewalDate }),
      ...(validatedData.vendor !== undefined && { vendor: validatedData.vendor ? InputSanitizer.sanitizeString(validatedData.vendor) : null }),
      ...(validatedData.licenseKey !== undefined && { licenseKey: validatedData.licenseKey ? InputSanitizer.sanitizeString(validatedData.licenseKey) : null }),
      ...(validatedData.notes !== undefined && { notes: validatedData.notes ? InputSanitizer.sanitizeString(validatedData.notes) : null }),
    };

    const subscription = await db.subscription.update({
      where: { id },
      data: sanitizedData,
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      );
    }

    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await db.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    await db.subscription.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}