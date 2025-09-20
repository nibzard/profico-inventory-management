import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get equipment counts by status
    const equipmentByStatus = await prisma.equipment.groupBy({
      by: ['status'],
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
      _count: {
        id: true,
      },
      _sum: {
        purchasePrice: true,
      },
    });

    // Get recent equipment
    const recentEquipment = await prisma.equipment.findMany({
      select: {
        id: true,
        name: true,
        serialNumber: true,
        status: true,
        purchaseDate: true,
        purchasePrice: true,
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
      recentEquipment,
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}