// ABOUTME: API endpoint for generating equipment reports with validation
// ABOUTME: Handles GET requests for equipment reports with filtering and validation

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ValidationHelper, reportSchemas } from '@/lib/validation';
import { withSecurity } from '@/lib/security-middleware';

interface AuthenticatedRequest extends NextRequest {
  user?: {
    name?: string;
    role?: string;
  };
}

interface DateFilter {
  gte?: Date;
  lte?: Date;
}

export async function GET(request: Request) {
  return withSecurity(request as NextRequest, async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      
      // Validate report parameters
    const rawParams = Object.fromEntries(searchParams.entries());
    const validatedParams = reportSchemas.generate.partial().safeParse(rawParams);
    
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid report parameters', details: validatedParams.error.issues },
        { status: 400 }
      );
    }

    const params = validatedParams.data;

    // Build where clause based on validated parameters
    const where: Record<string, unknown> = {};

    if (params.category) {
      where.category = params.category;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.team) {
      where.currentOwner = {
        teamId: params.team,
      };
    }

    if (params.dateFrom || params.dateTo) {
      const dateFilter: DateFilter = {};
      if (params.dateFrom) {
        dateFilter.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        dateFilter.lte = new Date(params.dateTo);
      }
      where.purchaseDate = dateFilter;
    }

    // Get equipment counts by status
    const equipmentByStatus = await prisma.equipment.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true,
      },
    });

    const statusCounts = equipmentByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Get equipment counts by category
    const equipmentByCategory = await prisma.equipment.groupBy({
      by: ['category'],
      where,
      _count: {
        id: true,
      },
    });

    const categoryCounts = equipmentByCategory.reduce((acc, item) => {
      acc[item.category] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Get total value and count
    const totalStats = await prisma.equipment.aggregate({
      where,
      _count: {
        id: true,
      },
      _sum: {
        purchasePrice: true,
      },
    });

    // Get recent equipment
    const recentEquipment = await prisma.equipment.findMany({
      where,
      select: {
        id: true,
        name: true,
        serialNumber: true,
        status: true,
        purchaseDate: true,
        purchasePrice: true,
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const reportData = {
      totalEquipment: totalStats._count.id || 0,
      availableEquipment: statusCounts['available'] || 0,
      assignedEquipment: statusCounts['assigned'] || 0,
      maintenanceEquipment: statusCounts['maintenance'] || 0,
      brokenEquipment: statusCounts['broken'] || 0,
      decommissionedEquipment: statusCounts['decommissioned'] || 0,
      totalValue: totalStats._sum.purchasePrice || 0,
      equipmentByCategory: categoryCounts,
      equipmentByStatus: statusCounts,
      recentEquipment: ValidationHelper.sanitizeDbResults(recentEquipment),
      filters: params,
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
  }, {
    requireAuth: true,
    enableRateLimit: true,
    requiredRoles: ['admin', 'team_lead'], // Only admins and team leads can access reports
  });
}