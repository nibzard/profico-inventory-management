import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Build the where clause based on filters
    const where: Record<string, unknown> = {};

    // Search filters
    const search = searchParams.get('search');
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    const category = searchParams.get('category');
    if (category && category !== 'all') {
      where.category = category;
    }

    // Status filter
    const status = searchParams.get('status');
    if (status && status !== 'all') {
      where.status = status;
    }

    // Owner filter
    const owner = searchParams.get('owner');
    if (owner && owner !== 'all') {
      if (owner === 'unassigned') {
        where.currentOwnerId = null;
      } else {
        where.currentOwnerId = owner;
      }
    }

    // Team filter
    const team = searchParams.get('team');
    if (team && team !== 'all') {
      where.currentOwner = {
        teamId: team,
      };
    }

    // Brand filter
    const brand = searchParams.get('brand');
    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }

    // Location filter
    const location = searchParams.get('location');
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Purchase method filter
    const purchaseMethod = searchParams.get('purchaseMethod');
    if (purchaseMethod && purchaseMethod !== 'all') {
      where.purchaseMethod = purchaseMethod;
    }

    // Price range filter
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    if (priceMin || priceMax) {
      where.purchasePrice = {};
      if (priceMin) {
        where.purchasePrice.gte = parseFloat(priceMin);
      }
      if (priceMax) {
        where.purchasePrice.lte = parseFloat(priceMax);
      }
    }

    // Date range filter
    const purchaseDateFrom = searchParams.get('purchaseDateFrom');
    const purchaseDateTo = searchParams.get('purchaseDateTo');
    if (purchaseDateFrom || purchaseDateTo) {
      where.purchaseDate = {};
      if (purchaseDateFrom) {
        where.purchaseDate.gte = new Date(purchaseDateFrom);
      }
      if (purchaseDateTo) {
        where.purchaseDate.lte = new Date(purchaseDateTo);
      }
    }

    // Tags filter
    const tags = searchParams.get('tags');
    if (tags) {
      const tagArray = tags.split(',').filter(Boolean);
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
    if (session.user.role === 'user') {
      // Regular users can only see equipment assigned to them or available equipment
      where.OR = [
        ...((where.OR || []) as Array<Record<string, unknown>>),
        { currentOwnerId: session.user.id },
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
        take: limit,
      }),
      prisma.equipment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      equipment,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error searching equipment:', error);
    return NextResponse.json(
      { error: 'Failed to search equipment' },
      { status: 500 }
    );
  }
}