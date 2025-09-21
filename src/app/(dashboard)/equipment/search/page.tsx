// ABOUTME: Client-side equipment search page using the new search API
// ABOUTME: Provides real-time search with role-based filtering and enhanced UX

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EquipmentSearch } from "@/components/equipment/equipment-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Download, QrCode, Search } from "lucide-react";
import Link from "next/link";

export default async function EquipmentSearchPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { user } = session;

  // Fetch categories and users for filter options
  const [categories, users] = await Promise.all([
    prisma.equipment.findMany({
      select: { category: true },
      distinct: ["category"],
    }),
    user.role !== "user"
      ? prisma.user.findMany({
          select: { id: true, name: true },
          where: { isActive: true },
          orderBy: { name: "asc" },
        })
      : [],
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/equipment">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Equipment
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Search className="h-8 w-8" />
                Advanced Equipment Search
              </h1>
              <p className="text-gray-600">
                {user.role === "user"
                  ? "Search your assigned equipment and available items"
                  : "Search and filter all equipment in the system"}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
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
                  Export Results
                </Button>
                <Button variant="outline">
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Codes
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Feature Description */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Search className="h-5 w-5" />
              Real-time Search Features
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold">🔍 Instant Search</h4>
                <p className="text-sm">Search across name, serial, brand, and model</p>
              </div>
              <div>
                <h4 className="font-semibold">🛡️ Role-based Access</h4>
                <p className="text-sm">Automatically filters based on your permissions</p>
              </div>
              <div>
                <h4 className="font-semibold">⚡ Real-time Filters</h4>
                <p className="text-sm">Advanced filtering with live results</p>
              </div>
              <div>
                <h4 className="font-semibold">📱 Responsive Design</h4>
                <p className="text-sm">Works seamlessly on all devices</p>
              </div>
              <div>
                <h4 className="font-semibold">🔐 Secure API</h4>
                <p className="text-sm">Protected with authentication and rate limiting</p>
              </div>
              <div>
                <h4 className="font-semibold">💨 Fast Performance</h4>
                <p className="text-sm">Debounced search with intelligent caching</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Component */}
        <EquipmentSearch
          categories={categories.map((c) => c.category)}
          users={users}
          initialFilters={{}}
        />
      </div>
    </div>
  );
}