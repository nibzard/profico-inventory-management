// ABOUTME: Modern equipment search component with real-time filtering
// ABOUTME: Integrates with secure API and provides role-based equipment access

"use client";

import { useState } from "react";
import { Search, Filter, X, Loader2, RefreshCw } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useEquipmentSearch, type SearchFilters } from "@/hooks/use-equipment-search";
import { EquipmentList } from "./equipment-list";

interface EquipmentSearchProps {
  categories?: string[];
  users?: { id: string; name: string }[];
  initialFilters?: SearchFilters;
}

export function EquipmentSearch({
  categories = [],
  users = [],
  initialFilters = {},
}: EquipmentSearchProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || "");

  const {
    equipment,
    filters,
    currentPage,
    totalCount,
    totalPages,
    isLoading,
    error,
    permissions,
    updateFilters,
    clearFilters,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    refresh,
    hasResults,
    hasFilters,
    canGoNext,
    canGoPrevious,
  } = useEquipmentSearch({
    initialFilters,
    pageSize: 12,
    debounceMs: 300,
    autoSearch: true,
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    updateFilters({ search: value || undefined });
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    updateFilters({ [key]: value === "all" ? undefined : value });
  };

  const handleClearAll = () => {
    setSearchTerm("");
    clearFilters();
    setShowAdvancedFilters(false);
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(
      (value) => value !== undefined && value !== null && value !== ""
    ).length;
  };

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "available", label: "Available" },
    { value: "assigned", label: "Assigned" },
    { value: "maintenance", label: "Maintenance" },
    { value: "broken", label: "Broken" },
    { value: "decommissioned", label: "Decommissioned" },
  ];

  const purchaseMethodOptions = [
    { value: "all", label: "All Methods" },
    { value: "company_card", label: "Company Card" },
    { value: "zopi", label: "ZOPI" },
    { value: "leasing", label: "Leasing" },
    { value: "personal", label: "Personal" },
  ];

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Equipment Search
              </CardTitle>
              <CardDescription>
                {totalCount > 0
                  ? `Found ${totalCount} items`
                  : "Search and filter equipment"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name, serial number, brand, model..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="whitespace-nowrap"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </Button>
            {hasFilters && (
              <Button variant="ghost" onClick={handleClearAll}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={filters.category || "all"}
                    onValueChange={(value) => handleFilterChange("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.replace("_", " ").toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) => handleFilterChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Owner Filter (only for admins and team leads) */}
                {permissions.canViewAll && (
                  <div className="space-y-2">
                    <Label htmlFor="owner">Owner</Label>
                    <Select
                      value={filters.owner || "all"}
                      onValueChange={(value) => handleFilterChange("owner", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Owners" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Owners</SelectItem>
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

                {/* Purchase Method Filter */}
                <div className="space-y-2">
                  <Label htmlFor="purchaseMethod">Purchase Method</Label>
                  <Select
                    value={filters.purchaseMethod || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("purchaseMethod", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseMethodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Brand Filter */}
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    placeholder="Filter by brand..."
                    value={filters.brand || ""}
                    onChange={(e) =>
                      updateFilters({ brand: e.target.value || undefined })
                    }
                  />
                </div>

                {/* Location Filter */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    placeholder="Filter by location..."
                    value={filters.location || ""}
                    onChange={(e) =>
                      updateFilters({ location: e.target.value || undefined })
                    }
                  />
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <Label>Price Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.priceMin || ""}
                      onChange={(e) =>
                        updateFilters({
                          priceMin: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.priceMax || ""}
                      onChange={(e) =>
                        updateFilters({
                          priceMax: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Tags Filter */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    placeholder="Filter by tags..."
                    value={filters.tags || ""}
                    onChange={(e) =>
                      updateFilters({ tags: e.target.value || undefined })
                    }
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Active Filters Display */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => {
                if (!value) return null;
                return (
                  <Badge key={key} variant="secondary" className="gap-1">
                    {key}: {value.toString()}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
                      onClick={() => updateFilters({ [key]: undefined })}
                    />
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <X className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasResults && (
        <EquipmentList
          equipment={equipment}
          currentPage={currentPage}
          totalPages={totalPages}
          userRole={permissions.canViewAll ? "admin" : "user"}
          userId=""
        />
      )}

      {/* No Results */}
      {!isLoading && !hasResults && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No equipment found</h3>
              <p className="text-sm">
                {hasFilters
                  ? "Try adjusting your search filters"
                  : "No equipment matches your search criteria"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * 12) + 1} to {Math.min(currentPage * 12, totalCount)} of {totalCount} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={!canGoPrevious || isLoading}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => goToPage(page)}
                    disabled={isLoading}
                  >
                    {page}
                  </Button>
                );
              })}
              {totalPages > 5 && <span className="text-gray-400">...</span>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={!canGoNext || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}