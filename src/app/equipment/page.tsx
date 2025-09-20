// ABOUTME: Equipment listing page with search, filtering, and role-based actions
// ABOUTME: Main equipment management interface for viewing and managing all equipment

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { EquipmentList } from "@/components/equipment/equipment-list";
import { EquipmentFilters } from "@/components/equipment/equipment-filters";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Download, QrCode, Search } from "lucide-react";
import Link from "next/link";

interface SearchParams {
  search?: string;
  category?: string;
  status?: string;
  owner?: string;
  page?: string;
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { user } = session;
  const currentPage = parseInt(searchParams.page || "1");
  const pageSize = 12;

  // Build filters
  const filters: Record<string, unknown> = {};

  if (searchParams.search) {
    filters.OR = [
      { name: { contains: searchParams.search, mode: "insensitive" } },
      { serialNumber: { contains: searchParams.search, mode: "insensitive" } },
      { brand: { contains: searchParams.search, mode: "insensitive" } },
      { model: { contains: searchParams.search, mode: "insensitive" } },
    ];
  }

  if (searchParams.category) {
    filters.category = searchParams.category;
  }

  if (searchParams.status) {
    filters.status = searchParams.status;
  }

  if (searchParams.owner) {
    filters.currentOwnerId = searchParams.owner;
  }

  // For regular users, only show their own equipment or available equipment
  if (user.role === "user") {
    filters.OR = [{ currentOwnerId: user.id }, { status: "available" }];
  }

  // Fetch equipment with pagination
  const [equipment, totalCount, categories, users] = await Promise.all([
    db.equipment.findMany({
      where: filters,
      include: {
        currentOwner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    db.equipment.count({ where: filters }),
    db.equipment.findMany({
      select: { category: true },
      distinct: ["category"],
    }),
    user.role !== "user"
      ? db.user.findMany({
          select: { id: true, name: true },
          where: { isActive: true },
          orderBy: { name: "asc" },
        })
      : [],
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Equipment</h1>
            <p className="text-gray-600">
              {user.role === "user"
                ? "View your assigned equipment and available items"
                : "Manage all equipment in the system"}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" asChild>
              <Link href="/equipment/search">
                <Search className="h-4 w-4 mr-2" />
                Advanced Search
              </Link>
            </Button>
            {(user.role === "admin" || user.role === "team_lead") && (
              <>
                <Button asChild>
                  <Link href="/equipment/add">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Equipment
                  </Link>
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline">
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Codes
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {equipment.filter((e) => e.status === "available").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Assigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {equipment.filter((e) => e.status === "assigned").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {equipment.filter((e) => e.status === "maintenance").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <EquipmentFilters
          categories={categories.map((c) => c.category)}
          users={users}
          currentFilters={searchParams}
          userRole={user.role}
        />

        {/* Equipment List */}
        <EquipmentList
          equipment={equipment}
          currentPage={currentPage}
          totalPages={totalPages}
          userRole={user.role}
          userId={user.id}
        />
      </div>
    </div>
  );
}
