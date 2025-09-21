// ABOUTME: API endpoint for equipment workflow statistics and analytics
// ABOUTME: Provides comprehensive metrics for equipment management dashboard

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total equipment count
    const totalEquipment = await db.equipment.count();

    // Get equipment counts by status
    const [availableEquipment, assignedEquipment, maintenanceEquipment, brokenEquipment] = await Promise.all([
      db.equipment.count({ where: { status: "available" } }),
      db.equipment.count({ where: { status: "assigned" } }),
      db.equipment.count({ where: { status: "maintenance" } }),
      db.equipment.count({ where: { status: "broken" } }),
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = await db.equipmentHistory.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Get pending actions count (equipment needing attention)
    const pendingActions = await db.equipment.count({
      where: {
        OR: [
          { status: "maintenance" },
          { status: "broken" },
          { 
            AND: [
              { status: "assigned" },
              { 
                OR: [
                  { nextMaintenanceDate: { lte: new Date() } },
                  { warrantyExpiry: { lte: new Date() } }
                ]
              }
            ]
          }
        ],
      },
    });

    // Get category distribution
    const categoryDistribution = await db.equipment.groupBy({
      by: ["category"],
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
    });

    // Get monthly trends (last 6 months)
    const monthlyTrends = await db.$queryRaw`
      SELECT 
        strftime('%Y-%m', createdAt) as month,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'broken' THEN 1 ELSE 0 END) as broken
      FROM equipment 
      WHERE createdAt >= datetime('now', '-6 months')
      GROUP BY strftime('%Y-%m', createdAt)
      ORDER BY month ASC
    ` as any[];

    // Get maintenance metrics
    const maintenanceMetrics = await db.maintenanceRecord.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    // Get equipment age distribution
    const ageDistribution = await db.$queryRaw`
      SELECT 
        CASE 
          WHEN julianday('now') - julianday(purchaseDate) <= 365 THEN '0-1 year'
          WHEN julianday('now') - julianday(purchaseDate) <= 730 THEN '1-2 years'
          WHEN julianday('now') - julianday(purchaseDate) <= 1095 THEN '2-3 years'
          ELSE '3+ years'
        END as age_range,
        COUNT(*) as count
      FROM equipment 
      GROUP BY age_range
      ORDER BY age_range
    ` as any[];

    // Get user assignment metrics
    const userAssignmentMetrics = await db.equipment.groupBy({
      by: ["currentOwnerId"],
      _count: { currentOwnerId: true },
      where: {
        currentOwnerId: { not: null },
        status: "assigned",
      },
      orderBy: { _count: { currentOwnerId: "desc" } },
      take: 10,
    });

    // Get top users by assignment count
    const topUsers = await db.user.findMany({
      where: {
        id: {
          in: userAssignmentMetrics.map(metric => metric.currentOwnerId),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            ownedEquipment: {
              where: { status: "assigned" },
            },
          },
        },
      },
    });

    const stats = {
      totalEquipment,
      availableEquipment,
      assignedEquipment,
      maintenanceEquipment,
      brokenEquipment,
      pendingActions,
      recentActivity,
      categoryDistribution,
      monthlyTrends,
      maintenanceMetrics,
      ageDistribution,
      topUsers,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching workflow stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}