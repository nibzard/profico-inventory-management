// ABOUTME: API endpoint for detailed depreciation analysis and reporting
// ABOUTME: Provides comprehensive depreciation tracking with age-based analysis

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
      
      // Validate parameters
      const rawParams = Object.fromEntries(searchParams.entries());
      const validatedParams = reportSchemas.generate.partial().safeParse(rawParams);
      
      if (!validatedParams.success) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: validatedParams.error.issues },
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

      // Get current date for age calculations
      const currentDate = new Date();
      const twoYearsAgo = new Date(currentDate.getFullYear() - 2, currentDate.getMonth(), currentDate.getDate());

      // Detailed age-based depreciation analysis
      const ageGroups = [
        { name: 'Under 6 months', maxAge: 6, rate: 0.0 },
        { name: '6-12 months', minAge: 6, maxAge: 12, rate: 0.25 },
        { name: '1-2 years', minAge: 12, maxAge: 24, rate: 0.5 },
        { name: '2-3 years', minAge: 24, maxAge: 36, rate: 0.75 },
        { name: '3-4 years', minAge: 36, maxAge: 48, rate: 0.875 },
        { name: '4-5 years', minAge: 48, maxAge: 60, rate: 0.9375 },
        { name: 'Over 5 years', minAge: 60, rate: 1.0 },
      ];

      const depreciationByAge = await Promise.all(
        ageGroups.map(async (group) => {
          const dateFilter: Record<string, Date> = {};
          const now = new Date();
          
          if (group.maxAge) {
            const maxDate = new Date(now.getFullYear(), now.getMonth() - group.maxAge, now.getDate());
            dateFilter.gte = maxDate;
          }
          
          if (group.minAge) {
            const minDate = new Date(now.getFullYear(), now.getMonth() - group.minAge, now.getDate());
            dateFilter.lte = minDate;
          } else {
            // For "Under X months" group, we only need gte
            if (!group.maxAge) {
              dateFilter.lte = now;
            }
          }

          const stats = await prisma.equipment.aggregate({
            where: {
              ...where,
              purchaseDate: dateFilter,
            },
            _count: { id: true },
            _sum: { purchasePrice: true },
            _avg: { purchasePrice: true },
          });

          return {
            ageRange: group.name,
            depreciationRate: group.rate,
            equipmentCount: stats._count.id || 0,
            originalValue: stats._sum.purchasePrice || 0,
            averageValue: stats._avg.purchasePrice || 0,
            currentValue: (stats._sum.purchasePrice || 0) * (1 - group.rate),
            depreciatedValue: (stats._sum.purchasePrice || 0) * group.rate,
          };
        })
      );

      // Get depreciation by category
      const categories = await prisma.equipment.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
        _sum: { purchasePrice: true },
      });

      const depreciationByCategory = await Promise.all(
        categories.map(async (category) => {
          const categoryAgeAnalysis = await Promise.all(
            ageGroups.map(async (group) => {
              const dateFilter: Record<string, Date> = {};
              const now = new Date();
              
              if (group.maxAge) {
                const maxDate = new Date(now.getFullYear(), now.getMonth() - group.maxAge, now.getDate());
                dateFilter.gte = maxDate;
              }
              
              if (group.minAge) {
                const minDate = new Date(now.getFullYear(), now.getMonth() - group.minAge, now.getDate());
                dateFilter.lte = minDate;
              } else if (!group.maxAge) {
                dateFilter.lte = now;
              }

              const stats = await prisma.equipment.aggregate({
                where: {
                  ...where,
                  category: category.category,
                  purchaseDate: dateFilter,
                },
                _count: { id: true },
                _sum: { purchasePrice: true },
              });

              return {
                ageRange: group.name,
                depreciationRate: group.rate,
                equipmentCount: stats._count.id || 0,
                originalValue: stats._sum.purchasePrice || 0,
                currentValue: (stats._sum.purchasePrice || 0) * (1 - group.rate),
              };
            })
          );

          const categoryTotal = categoryAgeAnalysis.reduce((acc, age) => ({
            equipmentCount: acc.equipmentCount + age.equipmentCount,
            originalValue: acc.originalValue + age.originalValue,
            currentValue: acc.currentValue + age.currentValue,
          }), { equipmentCount: 0, originalValue: 0, currentValue: 0 });

          return {
            category: category.category,
            totalEquipment: category._count.id,
            totalOriginalValue: category._sum.purchasePrice || 0,
            depreciatedValue: categoryTotal.originalValue - categoryTotal.currentValue,
            currentValue: categoryTotal.currentValue,
            depreciationRate: categoryTotal.originalValue > 0 
              ? (categoryTotal.originalValue - categoryTotal.currentValue) / categoryTotal.originalValue 
              : 0,
            ageBreakdown: categoryAgeAnalysis,
          };
        })
      );

      // Get purchase method analysis
      const purchaseMethodAnalysis = await prisma.equipment.groupBy({
        by: ['purchaseMethod'],
        where,
        _count: { id: true },
        _sum: { purchasePrice: true },
      });

      const purchaseMethodDepreciation = await Promise.all(
        purchaseMethodAnalysis.map(async (method) => {
          const methodDepreciation = await prisma.equipment.aggregate({
            where: {
              ...where,
              purchaseMethod: method.purchaseMethod,
              purchaseDate: { lte: twoYearsAgo },
            },
            _count: { id: true },
            _sum: { purchasePrice: true },
          });

          return {
            purchaseMethod: method.purchaseMethod,
            totalEquipment: method._count.id,
            totalValue: method._sum.purchasePrice || 0,
            depreciatedEquipment: methodDepreciation._count.id || 0,
            depreciatedValue: methodDepreciation._sum.purchasePrice || 0,
            depreciationPercentage: method._count.id > 0 
              ? ((methodDepreciation._count.id || 0) / method._count.id) * 100 
              : 0,
          };
        })
      );

      // Calculate overall summary
      const overallSummary = depreciationByAge.reduce((acc, age) => ({
        totalEquipment: acc.totalEquipment + age.equipmentCount,
        totalOriginalValue: acc.totalOriginalValue + age.originalValue,
        totalCurrentValue: acc.totalCurrentValue + age.currentValue,
        totalDepreciatedValue: acc.totalDepreciatedValue + age.depreciatedValue,
      }), { totalEquipment: 0, totalOriginalValue: 0, totalCurrentValue: 0, totalDepreciatedValue: 0 });

      const averageDepreciationRate = overallSummary.totalOriginalValue > 0 
        ? overallSummary.totalDepreciatedValue / overallSummary.totalOriginalValue 
        : 0;

      // Get equipment nearing full depreciation (older than 4.5 years)
      const nearingFullDepreciation = await prisma.equipment.findMany({
        where: {
          ...where,
          purchaseDate: { lte: new Date(currentDate.getFullYear() - 4.5, currentDate.getMonth(), currentDate.getDate()) },
          purchasePrice: { gt: 0 },
        },
        select: {
          id: true,
          name: true,
          serialNumber: true,
          purchaseDate: true,
          purchasePrice: true,
          category: true,
          status: true,
          currentOwner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          purchaseDate: 'asc',
        },
        take: 20,
      });

      // Format dates for response
      const formattedEquipment = nearingFullDepreciation.map(item => ({
        ...item,
        purchaseDate: item.purchaseDate.toISOString().split('T')[0],
        currentValue: (item.purchasePrice || 0) * 0.1, // 90% depreciated
      }));

      const depreciationReport = {
        summary: {
          totalEquipment: overallSummary.totalEquipment,
          totalOriginalValue: overallSummary.totalOriginalValue,
          totalCurrentValue: overallSummary.totalCurrentValue,
          totalDepreciatedValue: overallSummary.totalDepreciatedValue,
          averageDepreciationRate,
          netBookValue: overallSummary.totalCurrentValue,
        },
        byAge: depreciationByAge,
        byCategory: depreciationByCategory,
        byPurchaseMethod: purchaseMethodDepreciation,
        equipmentNearingFullDepreciation: ValidationHelper.sanitizeDbResults(formattedEquipment),
        generatedAt: new Date().toISOString(),
        filters: params,
      };

      return NextResponse.json(depreciationReport);
    } catch (error) {
      console.error('Error generating depreciation report:', error);
      
      if (error instanceof Error && error.message.includes('Invalid')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to generate depreciation report' },
        { status: 500 }
      );
    }
  }, {
    requireAuth: true,
    enableRateLimit: true,
    requiredRoles: ['admin', 'team_lead'],
  });
}