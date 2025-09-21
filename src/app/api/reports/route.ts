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

    // Get enhanced depreciation analysis
    const currentDate = new Date();
    const oneYearAgo = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
    const twoYearsAgo = new Date(currentDate.getFullYear() - 2, currentDate.getMonth(), currentDate.getDate());
    const threeYearsAgo = new Date(currentDate.getFullYear() - 3, currentDate.getMonth(), currentDate.getDate());
    
    // Full depreciation analysis by age groups
    const depreciationByAge = await Promise.all([
      // Under 1 year (0% depreciation)
      prisma.equipment.aggregate({
        where: {
          ...where,
          purchaseDate: { gt: oneYearAgo },
        },
        _count: { id: true },
        _sum: { purchasePrice: true },
      }),
      // 1-2 years (50% depreciation)
      prisma.equipment.aggregate({
        where: {
          ...where,
          purchaseDate: { lte: oneYearAgo, gt: twoYearsAgo },
        },
        _count: { id: true },
        _sum: { purchasePrice: true },
      }),
      // 2-3 years (75% depreciation)
      prisma.equipment.aggregate({
        where: {
          ...where,
          purchaseDate: { lte: twoYearsAgo, gt: threeYearsAgo },
        },
        _count: { id: true },
        _sum: { purchasePrice: true },
      }),
      // Over 3 years (100% depreciation)
      prisma.equipment.aggregate({
        where: {
          ...where,
          purchaseDate: { lte: threeYearsAgo },
        },
        _count: { id: true },
        _sum: { purchasePrice: true },
      }),
    ]);

    // Calculate depreciation metrics
    const depreciationAnalysis = {
      byAge: [
        {
          ageRange: 'Under 1 year',
          depreciationRate: 0,
          count: depreciationByAge[0]._count.id || 0,
          originalValue: depreciationByAge[0]._sum.purchasePrice || 0,
          currentValue: depreciationByAge[0]._sum.purchasePrice || 0,
        },
        {
          ageRange: '1-2 years',
          depreciationRate: 0.5,
          count: depreciationByAge[1]._count.id || 0,
          originalValue: depreciationByAge[1]._sum.purchasePrice || 0,
          currentValue: (depreciationByAge[1]._sum.purchasePrice || 0) * 0.5,
        },
        {
          ageRange: '2-3 years',
          depreciationRate: 0.75,
          count: depreciationByAge[2]._count.id || 0,
          originalValue: depreciationByAge[2]._sum.purchasePrice || 0,
          currentValue: (depreciationByAge[2]._sum.purchasePrice || 0) * 0.25,
        },
        {
          ageRange: 'Over 3 years',
          depreciationRate: 1.0,
          count: depreciationByAge[3]._count.id || 0,
          originalValue: depreciationByAge[3]._sum.purchasePrice || 0,
          currentValue: 0,
        },
      ],
      summary: {
        totalEquipment: depreciationByAge.reduce((sum, age) => sum + (age._count.id || 0), 0),
        totalOriginalValue: depreciationByAge.reduce((sum, age) => sum + (age._sum.purchasePrice || 0), 0),
        totalCurrentValue: depreciationByAge.reduce((sum, age, index) => {
          const rates = [1, 0.5, 0.25, 0];
          return sum + ((age._sum.purchasePrice || 0) * rates[index]);
        }, 0),
        averageDepreciationRate: 0,
      },
    };

    // Calculate average depreciation rate
    if (depreciationAnalysis.summary.totalOriginalValue > 0) {
      depreciationAnalysis.summary.averageDepreciationRate = 
        (depreciationAnalysis.summary.totalOriginalValue - depreciationAnalysis.summary.totalCurrentValue) / 
        depreciationAnalysis.summary.totalOriginalValue;
    }

    // Get depreciation by category
    const depreciationByCategory = await prisma.equipment.groupBy({
      by: ['category'],
      where,
      _sum: { purchasePrice: true },
      _count: { id: true },
    });

    const categoryDepreciation = await Promise.all(
      depreciationByCategory.map(async (category) => {
        const categoryDepreciation = await prisma.equipment.aggregate({
          where: {
            ...where,
            category: category.category,
            purchaseDate: { lte: twoYearsAgo },
          },
          _count: { id: true },
          _sum: { purchasePrice: true },
        });

        return {
          category: category.category,
          totalEquipment: category._count.id,
          totalValue: category._sum.purchasePrice || 0,
          depreciatedEquipment: categoryDepreciation._count.id || 0,
          depreciatedValue: categoryDepreciation._sum.purchasePrice || 0,
          depreciationPercentage: category._count.id > 0 
            ? ((categoryDepreciation._count.id || 0) / category._count.id) * 100 
            : 0,
          valueDepreciationPercentage: (category._sum.purchasePrice || 0) > 0
            ? ((categoryDepreciation._sum.purchasePrice || 0) / (category._sum.purchasePrice || 0)) * 100
            : 0,
        };
      })
    );

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
      depreciationAnalysis: depreciationAnalysis,
      depreciationByCategory: categoryDepreciation,
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

  // Get enhanced depreciation analysis
  const currentDate = new Date();
  const oneYearAgo = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
  const twoYearsAgo = new Date(currentDate.getFullYear() - 2, currentDate.getMonth(), currentDate.getDate());
  const threeYearsAgo = new Date(currentDate.getFullYear() - 3, currentDate.getMonth(), currentDate.getDate());
  
  // Full depreciation analysis by age groups
  const depreciationByAge = await Promise.all([
    // Under 1 year (0% depreciation)
    prisma.equipment.aggregate({
      where: {
        ...where,
        purchaseDate: { gt: oneYearAgo },
      },
      _count: { id: true },
      _sum: { purchasePrice: true },
    }),
    // 1-2 years (50% depreciation)
    prisma.equipment.aggregate({
      where: {
        ...where,
        purchaseDate: { lte: oneYearAgo, gt: twoYearsAgo },
      },
      _count: { id: true },
      _sum: { purchasePrice: true },
    }),
    // 2-3 years (75% depreciation)
    prisma.equipment.aggregate({
      where: {
        ...where,
        purchaseDate: { lte: twoYearsAgo, gt: threeYearsAgo },
      },
      _count: { id: true },
      _sum: { purchasePrice: true },
    }),
    // Over 3 years (100% depreciation)
    prisma.equipment.aggregate({
      where: {
        ...where,
        purchaseDate: { lte: threeYearsAgo },
      },
      _count: { id: true },
      _sum: { purchasePrice: true },
    }),
  ]);

  // Calculate depreciation metrics
  const depreciationAnalysis = {
    byAge: [
      {
        ageRange: 'Under 1 year',
        depreciationRate: 0,
        count: depreciationByAge[0]._count.id || 0,
        originalValue: depreciationByAge[0]._sum.purchasePrice || 0,
        currentValue: depreciationByAge[0]._sum.purchasePrice || 0,
      },
      {
        ageRange: '1-2 years',
        depreciationRate: 0.5,
        count: depreciationByAge[1]._count.id || 0,
        originalValue: depreciationByAge[1]._sum.purchasePrice || 0,
        currentValue: (depreciationByAge[1]._sum.purchasePrice || 0) * 0.5,
      },
      {
        ageRange: '2-3 years',
        depreciationRate: 0.75,
        count: depreciationByAge[2]._count.id || 0,
        originalValue: depreciationByAge[2]._sum.purchasePrice || 0,
        currentValue: (depreciationByAge[2]._sum.purchasePrice || 0) * 0.25,
      },
      {
        ageRange: 'Over 3 years',
        depreciationRate: 1.0,
        count: depreciationByAge[3]._count.id || 0,
        originalValue: depreciationByAge[3]._sum.purchasePrice || 0,
        currentValue: 0,
      },
    ],
    summary: {
      totalEquipment: depreciationByAge.reduce((sum, age) => sum + (age._count.id || 0), 0),
      totalOriginalValue: depreciationByAge.reduce((sum, age) => sum + (age._sum.purchasePrice || 0), 0),
      totalCurrentValue: depreciationByAge.reduce((sum, age, index) => {
        const rates = [1, 0.5, 0.25, 0];
        return sum + ((age._sum.purchasePrice || 0) * rates[index]);
      }, 0),
      averageDepreciationRate: 0,
    },
  };

  // Calculate average depreciation rate
  if (depreciationAnalysis.summary.totalOriginalValue > 0) {
    depreciationAnalysis.summary.averageDepreciationRate = 
      (depreciationAnalysis.summary.totalOriginalValue - depreciationAnalysis.summary.totalCurrentValue) / 
      depreciationAnalysis.summary.totalOriginalValue;
  }

  return {
    totalEquipment: totalStats._count.id || 0,
    availableEquipment: statusCounts['available'] || 0,
    assignedEquipment: statusCounts['assigned'] || 0,
    maintenanceEquipment: statusCounts['maintenance'] || 0,
    brokenEquipment: statusCounts['broken'] || 0,
    decommissionedEquipment: statusCounts['decommissioned'] || 0,
    totalValue: totalStats._sum.purchasePrice || 0,
    equipmentByStatus: statusCounts,
    depreciationAnalysis: depreciationAnalysis,
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
    byAge: Array<{
      ageRange: string;
      depreciationRate: number;
      count: number;
      originalValue: number;
      currentValue: number;
    }>;
    summary: {
      totalEquipment: number;
      totalOriginalValue: number;
      totalCurrentValue: number;
      averageDepreciationRate: number;
    };
  };
}, reportType: string) {
  let csvContent = '';
  
  if (reportType === 'inventory') {
    // Generate CSV headers for inventory report
    csvContent = 'Status,Count,Value\n';
    
    // Add status data
    Object.entries(data.equipmentByStatus).forEach(([status, count]) => {
      csvContent += `${status},${count},\n`;
    });
    
    // Add summary
    csvContent += `\nTotal Equipment,${data.totalEquipment},${data.totalValue}\n`;
    
    // Add enhanced depreciation analysis
    csvContent += '\nDepreciation Analysis by Age\n';
    csvContent += 'Age Range,Depreciation Rate,Equipment Count,Original Value,Current Value\n';
    
    data.depreciationAnalysis.byAge.forEach(ageGroup => {
      csvContent += `${ageGroup.ageRange},${(ageGroup.depreciationRate * 100).toFixed(1)}%,${ageGroup.count},${ageGroup.originalValue.toFixed(2)},${ageGroup.currentValue.toFixed(2)}\n`;
    });
    
    // Add depreciation summary
    csvContent += '\nDepreciation Summary\n';
    csvContent += 'Total Equipment,Total Original Value,Total Current Value,Average Depreciation Rate\n';
    csvContent += `${data.depreciationAnalysis.summary.totalEquipment},${data.depreciationAnalysis.summary.totalOriginalValue.toFixed(2)},${data.depreciationAnalysis.summary.totalCurrentValue.toFixed(2)},${(data.depreciationAnalysis.summary.averageDepreciationRate * 100).toFixed(2)}%\n`;
  } else if (reportType === 'value') {
    // Value report with detailed depreciation
    csvContent = 'Age Range,Depreciation Rate,Equipment Count,Original Value,Current Value,Value Loss\n';
    
    data.depreciationAnalysis.byAge.forEach(ageGroup => {
      const valueLoss = ageGroup.originalValue - ageGroup.currentValue;
      csvContent += `${ageGroup.ageRange},${(ageGroup.depreciationRate * 100).toFixed(1)}%,${ageGroup.count},${ageGroup.originalValue.toFixed(2)},${ageGroup.currentValue.toFixed(2)},${valueLoss.toFixed(2)}\n`;
    });
    
    // Add summary
    csvContent += `\nSummary\n`;
    csvContent += `Total Equipment,${data.depreciationAnalysis.summary.totalEquipment}\n`;
    csvContent += `Total Original Value,${data.depreciationAnalysis.summary.totalOriginalValue.toFixed(2)}\n`;
    csvContent += `Total Current Value,${data.depreciationAnalysis.summary.totalCurrentValue.toFixed(2)}\n`;
    csvContent += `Total Value Loss,${(data.depreciationAnalysis.summary.totalOriginalValue - data.depreciationAnalysis.summary.totalCurrentValue).toFixed(2)}\n`;
    csvContent += `Average Depreciation Rate,${(data.depreciationAnalysis.summary.averageDepreciationRate * 100).toFixed(2)}%\n`;
  }
  
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}