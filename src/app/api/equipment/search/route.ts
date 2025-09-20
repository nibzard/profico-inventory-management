import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ValidationHelper } from '@/lib/validation';
import { withSecurity } from '@/lib/security-middleware';

export async function GET(request: Request) {
  return withSecurity(request as any, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      
      // Apply role-based filtering based on authenticated user
      const user = (req as any).user;
      
      // Validate and sanitize pagination parameters
    const pagination = ValidationHelper.validatePaginationParams(searchParams);
    const offset = (pagination.page - 1) * pagination.limit;
    
    // Validate and sanitize search parameters
    const filters = ValidationHelper.validateSearchParams(searchParams);

    // Build the where clause based on filters
    const where: Record<string, unknown> = {};

    // Apply validated and sanitized filters
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category && filters.category !== 'all') {
      where.category = filters.category;
    }

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.owner && filters.owner !== 'all') {
      if (filters.owner === 'unassigned') {
        where.currentOwnerId = null;
      } else {
        where.currentOwnerId = filters.owner;
      }
    }

    if (filters.team && filters.team !== 'all') {
      where.currentOwner = {
        teamId: filters.team,
      };
    }

    if (filters.brand) {
      where.brand = { contains: filters.brand, mode: 'insensitive' };
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.purchaseMethod && filters.purchaseMethod !== 'all') {
      where.purchaseMethod = filters.purchaseMethod;
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      (where as any).purchasePrice = {};
      if (filters.priceMin !== null) {
        (where as any).purchasePrice.gte = filters.priceMin;
      }
      if (filters.priceMax !== null) {
        (where as any).purchasePrice.lte = filters.priceMax;
      }
    }

    if (filters.purchaseDateFrom || filters.purchaseDateTo) {
      (where as any).purchaseDate = {};
      if (filters.purchaseDateFrom) {
        (where as any).purchaseDate.gte = new Date(filters.purchaseDateFrom);
      }
      if (filters.purchaseDateTo) {
        (where as any).purchaseDate.lte = new Date(filters.purchaseDateTo);
      }
    }

    if (filters.tags) {
      const tagArray = filters.tags.split(',').filter(Boolean);
      if (tagArray.length > 0) {
        where.AND = tagArray.map((tag) => ({
          OR: [
            { name: { contains: tag, mode: 'insensitive' } },
            { description: { contains: tag, mode: 'insensitive' } },
            { notes: { contains: tag, mode: 'insensitive' } },
          ],
        }));
      }
    }

    // Apply role-based filtering
    if (user?.role === 'user') {
      // Regular users can only see equipment assigned to them or available equipment
      where.OR = [
        ...((where.OR || []) as Array<Record<string, unknown>>),
        { currentOwnerId: user.id },
        { status: 'available' },
      ];
    }

    // Get equipment with filters
    const [equipment, totalCount] = await Promise.all([
      prisma.equipment.findMany({
        where,
        include: {
          currentOwner: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
          { name: 'asc' },
        ],
        skip: offset,
        take: pagination.limit,
      }),
      prisma.equipment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pagination.limit);

    // Sanitize the response data
    const sanitizedEquipment = ValidationHelper.sanitizeDbResults(equipment);

    return NextResponse.json({
      equipment: sanitizedEquipment,
      pagination: {
        currentPage: pagination.page,
        totalPages,
        totalCount,
        limit: pagination.limit,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
    });
  } catch (error) {
    console.error('Error searching equipment:', error);
    
    // Handle validation errors specifically
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to search equipment' },
      { status: 500 }
    );
  }
  }, {
    requireAuth: true,
    enableRateLimit: true,
  });
}