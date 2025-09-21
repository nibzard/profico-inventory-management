import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { geminiOCRService } from '@/lib/gemini-ocr';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const InvoiceProcessingSchema = z.object({
  ocrData: z.object({
    vendor: z.string().optional(),
    invoiceNumber: z.string().optional(),
    date: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    vatAmount: z.number().optional(),
    invoiceType: z.enum(['equipment', 'subscription', 'mixed']).optional(),
    equipment: z.array(z.object({
      name: z.string(),
      serialNumber: z.string().optional(),
      specifications: z.string().optional(),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
      category: z.string().optional(),
    })).optional(),
    subscriptions: z.array(z.object({
      softwareName: z.string(),
      licenseType: z.string().optional(),
      subscriptionPeriod: z.string().optional(),
      seats: z.number().optional(),
      unitPrice: z.number().optional(),
      totalPrice: z.number().optional(),
      renewalDate: z.string().optional(),
    })).optional(),
    purchaseMethod: z.enum(['ProfiCo', 'ZOPI', 'Leasing', 'Off-the-shelf']).optional(),
    depreciationPeriod: z.number().optional(),
    confidence: z.number().optional(),
    rawText: z.string().optional(),
    extractionDetails: z.object({
      processingTime: z.number(),
      modelUsed: z.string(),
      tokensUsed: z.number().optional(),
    }).optional(),
  }),
  createEquipment: z.boolean().default(true),
  createSubscriptions: z.boolean().default(true),
  saveAsDraft: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = InvoiceProcessingSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validatedData.error },
        { status: 400 }
      );
    }

    const { ocrData, createEquipment, createSubscriptions, saveAsDraft } = validatedData.data;

    // Validate extracted data
    const validation = await geminiOCRService.validateExtractedData(ocrData);
    
    if (!validation.valid && !saveAsDraft) {
      return NextResponse.json({
        success: false,
        validation,
        error: 'Validation failed',
      }, { status: 400 });
    }

    // Generate equipment and subscription records if requested
    let equipmentRecords: any[] = [];
    let subscriptionRecords: any[] = [];
    
    if (createEquipment && (validation.valid || saveAsDraft) && ocrData.equipment?.length) {
      equipmentRecords = await geminiOCRService.generateEquipmentFromOCR(ocrData);
    }
    
    if (createSubscriptions && (validation.valid || saveAsDraft) && ocrData.subscriptions?.length) {
      subscriptionRecords = await geminiOCRService.generateSubscriptionsFromOCR(ocrData);
    }

    // Save extracted data as draft or processed invoice
    const invoiceRecord = await prisma.invoice.create({
      data: {
        vendor: ocrData.vendor || '',
        invoiceNumber: ocrData.invoiceNumber || '',
        invoiceDate: ocrData.date ? new Date(ocrData.date) : null,
        amount: ocrData.amount || 0,
        purchaseMethod: ocrData.purchaseMethod || 'Off-the-shelf',
        depreciationPeriod: ocrData.depreciationPeriod || 24,
        status: saveAsDraft ? 'draft' : 'processed',
        confidence: ocrData.confidence || 0,
        rawText: ocrData.rawText || '',
        processedBy: session.user.id,
        equipmentCount: ocrData.equipment?.length || 0,
        validationErrors: validation.valid ? null : JSON.stringify({
          errors: validation.errors,
          warnings: []
        }),
      },
    });

    // Create equipment records if requested
    let createdEquipment: any[] = [];
    if (createEquipment && equipmentRecords.length > 0) {
      createdEquipment = await Promise.all(
        equipmentRecords.map(async (equipment) => {
          return prisma.equipment.create({
            data: {
              ...equipment,
              invoiceId: invoiceRecord.id,
              createdBy: session.user.id,
            },
          });
        })
      );

      // Log equipment creation
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'EQUIPMENT_CREATED_FROM_OCR',
          details: JSON.stringify({
            invoiceId: invoiceRecord.id,
            equipmentCount: createdEquipment.length,
            vendor: ocrData.vendor,
            totalAmount: ocrData.amount,
            confidence: ocrData.confidence,
          }),
        },
      });
    }

    // Create subscription records if requested
    let createdSubscriptions: any[] = [];
    if (createSubscriptions && subscriptionRecords.length > 0) {
      createdSubscriptions = await Promise.all(
        subscriptionRecords.map(async (subscription) => {
          const { _ocrData, ...subscriptionData } = subscription;
          return prisma.subscription.create({
            data: {
              ...subscriptionData,
              assignedUserId: session.user.id, // Default to processor, can be changed later
            },
          });
        })
      );

      // Log subscription creation
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'SUBSCRIPTION_CREATED_FROM_OCR',
          details: JSON.stringify({
            invoiceId: invoiceRecord.id,
            subscriptionCount: createdSubscriptions.length,
            vendor: ocrData.vendor,
            totalAmount: ocrData.amount,
            confidence: ocrData.confidence,
          }),
        },
      });
    }

    // Return response with created records
    if (createdEquipment.length > 0 || createdSubscriptions.length > 0) {
      return NextResponse.json({
        success: true,
        invoice: invoiceRecord,
        equipment: createdEquipment,
        subscriptions: createdSubscriptions,
        validation,
        message: saveAsDraft ? 'Invoice saved as draft' : 
          `Successfully processed invoice and created ${createdEquipment.length} equipment and ${createdSubscriptions.length} subscription records`,
      });
    }

    // Log invoice processing
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: saveAsDraft ? 'INVOICE_DRAFT_CREATED' : 'INVOICE_PROCESSED',
        details: JSON.stringify({
          invoiceId: invoiceRecord.id,
          vendor: ocrData.vendor,
          amount: ocrData.amount,
          confidence: ocrData.confidence,
          validationErrors: validation.errors,
          validationWarnings: [],
          invoiceType: ocrData.invoiceType,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      invoice: invoiceRecord,
      validation,
      message: saveAsDraft ? 'Invoice saved as draft' : 'Invoice processed successfully',
    });
  } catch (error) {
    console.error('Invoice processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const vendor = searchParams.get('vendor');

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (vendor) where.vendor = { contains: vendor, mode: 'insensitive' };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          processedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
          equipment: {
            select: {
              id: true,
              name: true,
              status: true,
              serialNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}