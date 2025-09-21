// ABOUTME: API endpoint for generating equipment reports with validation
// ABOUTME: Handles GET requests for equipment reports with filtering and validation

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ValidationHelper, reportSchemas } from '@/lib/validation';
import { withSecurity } from '@/lib/security-middleware';

interface DateFilter {
  gte?: Date;
  lte?: Date;
}

export async function GET(request: NextRequest) {
  return withSecurity(request, async (req: NextRequest & { user?: { name?: string; role?: string } }) => {
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

    // Handle different report types
    if (params.type === 'assignment') {
      // For assignment reports, focus on assigned equipment
      where.status = 'assigned';
    } else if (params.type === 'maintenance') {
      // For maintenance reports, focus on equipment needing maintenance
      where.status = { in: ['maintenance', 'broken'] };
    } else if (params.type === 'value') {
      // For value reports, include all equipment but add value analytics
      // Value analytics are handled in the aggregation queries below
    }

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

    // Get value analytics by category
    const valueByCategory = await prisma.equipment.groupBy({
      by: ['category'],
      where,
      _sum: {
        purchasePrice: true,
      },
      _count: {
        id: true,
      },
    });

    const categoryValues = valueByCategory.reduce((acc, item) => {
      acc[item.category] = {
        totalValue: item._sum.purchasePrice || 0,
        count: item._count.id,
        averageValue: item._count.id > 0 ? (item._sum.purchasePrice || 0) / item._count.id : 0,
      };
      return acc;
    }, {} as Record<string, { totalValue: number; count: number; averageValue: number }>);

    // Get depreciation analysis (equipment older than 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    const depreciationStats = await prisma.equipment.aggregate({
      where: {
        ...where,
        purchaseDate: { lte: twoYearsAgo },
      },
      _count: {
        id: true,
      },
      _sum: {
        purchasePrice: true,
      },
    });

    // Get maintenance statistics
    const maintenanceStats = await prisma.maintenanceRecord.groupBy({
      by: ['status'],
      where: Object.keys(where).length > 0 ? {
        equipmentId: {
          in: (await prisma.equipment.findMany({
            where,
            select: { id: true }
          })).map(eq => eq.id)
        }
      } : undefined,
      _count: {
        id: true,
      },
    });

    const maintenanceCounts = maintenanceStats.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Get request statistics
    const requestStats = await prisma.equipmentRequest.groupBy({
      by: ['status'],
      where: {
        createdAt: params.dateFrom ? { gte: new Date(params.dateFrom) } : undefined,
      },
      _count: {
        id: true,
      },
    });

    const requestCounts = requestStats.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

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

    // Format dates for JSON serialization
    const formattedRecentEquipment = recentEquipment.map(item => ({
      ...item,
      purchaseDate: item.purchaseDate ? item.purchaseDate.toISOString().split('T')[0] : null,
    }));

    // Get team-based statistics if team filter is applied
    let teamStats = null;
    if (params.team) {
      const team = await prisma.team.findUnique({
        where: { id: params.team },
        select: {
          id: true,
          name: true,
        }
      });

      if (team) {
        const userCount = await prisma.user.count({
          where: { teamId: params.team }
        });

        const equipmentCount = await prisma.equipment.count({
          where: {
            ...where,
            status: 'assigned',
            currentOwner: { teamId: params.team }
          }
        });

        teamStats = {
          ...team,
          userCount,
          assignedEquipmentCount: equipmentCount,
        };
      }
    }

    // Get subscription statistics if this is a value report
    let subscriptionStats = null;
    if (params.type === 'value') {
      subscriptionStats = await prisma.subscription.aggregate({
        where: {
          isActive: true,
        },
        _count: {
          id: true,
        },
        _sum: {
          price: true,
        },
      });
    }

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
      valueByCategory: categoryValues,
      maintenanceByStatus: maintenanceCounts,
      requestsByStatus: requestCounts,
      depreciationAnalysis: {
        depreciatedEquipment: depreciationStats._count.id || 0,
        depreciatedValue: depreciationStats._sum.purchasePrice || 0,
        depreciationPercentage: totalStats._count.id > 0 
          ? ((depreciationStats._count.id || 0) / totalStats._count.id) * 100 
          : 0,
      },
      teamStats: teamStats ? {
        id: teamStats.id,
        name: teamStats.name,
        userCount: teamStats.userCount,
        assignedEquipmentCount: teamStats.assignedEquipmentCount,
      } : null,
      subscriptionStats: subscriptionStats ? {
        activeSubscriptions: subscriptionStats._count.id,
        monthlyCost: subscriptionStats._sum.price || 0,
        annualCost: (subscriptionStats._sum.price || 0) * 12,
      } : null,
      recentEquipment: ValidationHelper.sanitizeDbResults(formattedRecentEquipment),
      generatedAt: new Date().toISOString(),
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

export async function POST(request: NextRequest) {
  return withSecurity(request, async (req: NextRequest & { user?: { name?: string; role?: string } }) => {
    try {
      const body = await req.json();
      const { format, type, ...filters } = body;

      // Validate export parameters
      const validatedParams = reportSchemas.generate.parse({
        format: format || 'json',
        type: type || 'inventory',
        ...filters,
      });

      // Generate the report data (reuse GET logic)
      const reportData = await generateReportData(validatedParams);

      // Handle different export formats
      switch (validatedParams.format) {
        case 'csv':
          return exportAsCSV(reportData, validatedParams.type);
        case 'excel':
          return NextResponse.json({ error: 'Excel export not implemented yet' }, { status: 501 });
        case 'pdf':
          return NextResponse.json({ error: 'PDF export not implemented yet' }, { status: 501 });
        default:
          return NextResponse.json(reportData);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      
      if (error instanceof Error && error.message.includes('Invalid')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to export report' },
        { status: 500 }
      );
    }
  }, {
    requireAuth: true,
    enableRateLimit: true,
    requiredRoles: ['admin', 'team_lead'],
  });
}

// Helper function to generate report data (extracted from GET)
async function generateReportData(params: {
  type?: string;
  category?: string;
  status?: string;
  team?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  // Build where clause based on validated parameters
  const where: Record<string, unknown> = {};

  // Handle different report types
  if (params.type === 'assignment') {
    where.status = 'assigned';
  } else if (params.type === 'maintenance') {
    where.status = { in: ['maintenance', 'broken'] };
  }

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

  // Get depreciation analysis
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  const depreciationStats = await prisma.equipment.aggregate({
    where: {
      ...where,
      purchaseDate: { lte: twoYearsAgo },
    },
    _count: {
      id: true,
    },
    _sum: {
      purchasePrice: true,
    },
  });

  return {
    totalEquipment: totalStats._count.id || 0,
    availableEquipment: statusCounts['available'] || 0,
    assignedEquipment: statusCounts['assigned'] || 0,
    maintenanceEquipment: statusCounts['maintenance'] || 0,
    brokenEquipment: statusCounts['broken'] || 0,
    decommissionedEquipment: statusCounts['decommissioned'] || 0,
    totalValue: totalStats._sum.purchasePrice || 0,
    equipmentByStatus: statusCounts,
    depreciationAnalysis: {
      depreciatedEquipment: depreciationStats._count.id || 0,
      depreciatedValue: depreciationStats._sum.purchasePrice || 0,
      depreciationPercentage: totalStats._count.id > 0 
        ? ((depreciationStats._count.id || 0) / totalStats._count.id) * 100 
        : 0,
    },
    generatedAt: new Date().toISOString(),
    filters: params,
  };
}

// Helper function to export as CSV
function exportAsCSV(data: {
  equipmentByStatus: Record<string, number>;
  totalEquipment: number;
  totalValue: number;
  depreciationAnalysis: {
    depreciatedEquipment: number;
    depreciatedValue: number;
  };
}, reportType: string) {
  let csvContent = '';
  
  if (reportType === 'inventory') {
    // Generate CSV headers
    csvContent = 'Status,Count,Value\n';
    
    // Add status data
    Object.entries(data.equipmentByStatus).forEach(([status, count]) => {
      csvContent += `${status},${count},\n`;
    });
    
    // Add summary
    csvContent += `\nTotal Equipment,${data.totalEquipment},${data.totalValue}\n`;
    csvContent += `Depreciated Equipment,${data.depreciationAnalysis.depreciatedEquipment},${data.depreciationAnalysis.depreciatedValue}\n`;
  }
  
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="inventory-report-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}