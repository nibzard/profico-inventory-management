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

    // Build filters based on user role
    const where: Record<string, unknown> = {};
    
    // Apply role-based filtering
    if (session.user.role === "user") {
      where.assignedUserId = session.user.id;
    }

    // Apply search filters if provided
    const search = searchParams.get("search");
    if (search) {
      where.OR = [
        { softwareName: { contains: search, mode: "insensitive" } },
        { vendor: { contains: search, mode: "insensitive" } },
        { licenseKey: { contains: search, mode: "insensitive" } },
      ];
    }

    const vendor = searchParams.get("vendor");
    if (vendor) {
      where.vendor = { contains: vendor, mode: "insensitive" };
    }

    const billingCycle = searchParams.get("billingCycle");
    if (billingCycle) {
      where.billingFrequency = billingCycle;
    }

    const status = searchParams.get("status");
    if (status) {
      where.isActive = status === "ACTIVE";
    }

    const assignedTo = searchParams.get("assignedTo");
    if (assignedTo) {
      where.assignedUserId = assignedTo;
    }

    // Fetch subscriptions with detailed information
    const subscriptions = await db.subscription.findMany({
      where,
      include: {
        assignedUser: {
          select: { name: true, email: true },
        },
        subscriptionInvoices: {
          select: { status: true, dueDate: true, amount: true },
          orderBy: { dueDate: "desc" },
          take: 1,
        },
      },
      orderBy: { renewalDate: "asc" },
    });

    // Format data for CSV export
    const csvData = subscriptions.map(sub => ({
      softwareName: sub.softwareName,
      vendor: sub.vendor || "",
      assignedUser: sub.assignedUser.name,
      assignedEmail: sub.assignedUser.email,
      price: sub.price,
      billingCycle: sub.billingFrequency,
      paymentMethod: sub.paymentMethod === "company_card" ? "Company Card" : "Personal Card",
      invoiceRecipient: sub.invoiceRecipient,
      isReimbursement: sub.isReimbursement ? "Yes" : "No",
      status: sub.isActive ? "Active" : "Inactive",
      renewalDate: sub.renewalDate.toISOString().split('T')[0],
      licenseKey: sub.licenseKey || "",
      notes: sub.notes || "",
      createdAt: sub.createdAt.toISOString().split('T')[0],
      latestInvoiceStatus: sub.subscriptionInvoices[0]?.status || "No invoice",
      latestInvoiceAmount: sub.subscriptionInvoices[0]?.amount || 0,
    }));

    // Generate CSV
    const headers = [
      "Software Name",
      "Vendor",
      "Assigned User",
      "Assigned Email",
      "Price (EUR)",
      "Billing Cycle",
      "Payment Method",
      "Invoice Recipient",
      "Requires Reimbursement",
      "Status",
      "Renewal Date",
      "License Key",
      "Notes",
      "Created Date",
      "Latest Invoice Status",
      "Latest Invoice Amount (EUR)"
    ];

    const csvRows = csvData.map(row => [
      row.softwareName,
      row.vendor,
      row.assignedUser,
      row.assignedEmail,
      row.price,
      row.billingCycle,
      row.paymentMethod,
      row.invoiceRecipient,
      row.isReimbursement,
      row.status,
      row.renewalDate,
      row.licenseKey,
      row.notes,
      row.createdAt,
      row.latestInvoiceStatus,
      row.latestInvoiceAmount
    ]);

    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => 
        row.map(cell => 
          typeof cell === 'string' && cell.includes(',') 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(",")
      )
    ].join("\n");

    // Create response with CSV file
    const response = new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="subscriptions-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

    return response;
  } catch (error) {
    console.error("Error exporting subscriptions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}