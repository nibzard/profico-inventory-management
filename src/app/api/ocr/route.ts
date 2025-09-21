import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pdfProcessingService } from '@/lib/pdf-processing';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const OCRUploadSchema = z.object({
  files: z.array(z.instanceof(File)).min(1).max(10),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    // Validate input
    const validatedData = OCRUploadSchema.safeParse({ files });
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validatedData.error },
        { status: 400 }
      );
    }

    // Initialize processing service
    await pdfProcessingService.initialize();

    // Process files
    const fileBuffers = await Promise.all(
      files.map(async (file) => ({
        buffer: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
        mimetype: file.type,
      }))
    );

    const results = await pdfProcessingService.processMultipleFiles(fileBuffers);

    // Log processing activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'OCR_PROCESSING',
        details: JSON.stringify({
          filesProcessed: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          totalProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        averageProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
      },
    });
  } catch (error) {
    console.error('OCR processing error:', error);
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

    // Get processing statistics
    const stats = await pdfProcessingService.getProcessingStats();

    // Get recent OCR processing history
    const recentActivity = await prisma.activityLog.findMany({
      where: {
        action: 'OCR_PROCESSING',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      stats,
      recentActivity,
    });
  } catch (error) {
    console.error('Failed to get OCR stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}