// ABOUTME: Equipment filtering component with search and category filters
// ABOUTME: Provides filtering interface for equipment listing page

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, X } from "lucide-react";

interface EquipmentFiltersProps {
  categories: string[];
  users: { id: string; name: string }[];
  currentFilters: Record<string, unknown>;
  userRole: string;
}

export function EquipmentFilters({
  categories,
  users,
  currentFilters,
  userRole,
}: EquipmentFiltersProps) {
  const router = useRouter();

  const [search, setSearch] = useState(currentFilters.search || "");
  const [category, setCategory] = useState(currentFilters.category || "all");
  const [status, setStatus] = useState(currentFilters.status || "all");
  const [owner, setOwner] = useState(currentFilters.owner || "all");

  const statusOptions = [
    { value: "available", label: "Available" },
    { value: "assigned", label: "Assigned" },
    { value: "maintenance", label: "Maintenance" },
    { value: "broken", label: "Broken" },
    { value: "decommissioned", label: "Decommissioned" },
  ];

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (category && category !== "all") params.set("category", category);
    if (status && status !== "all") params.set("status", status);
    if (owner && owner !== "all") params.set("owner", owner);

    router.push(`/equipment?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setStatus("all");
    setOwner("all");
    router.push("/equipment");
  };

  const hasActiveFilters =
    search ||
    (category && category !== "all") ||
    (status && status !== "all") ||
    (owner && owner !== "all");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Filters</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Name, serial, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="mt-1">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="mt-1">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((statusOption) => (
                  <SelectItem
                    key={statusOption.value}
                    value={statusOption.value}
                  >
                    {statusOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Owner (Admin/Team Lead only) */}
          {userRole !== "user" && (
            <div>
              <Label htmlFor="owner">Owner</Label>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger id="owner" className="mt-1">
                  <SelectValue placeholder="All owners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All owners</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex space-x-2">
            <Button onClick={applyFilters}>Apply Filters</Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <p className="text-sm text-gray-600">
              {Object.keys(currentFilters).length} filter(s) applied
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
