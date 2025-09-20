// ABOUTME: Custom hook for equipment search functionality
// ABOUTME: Provides real-time search with role-based filtering and caching

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { Equipment, User } from "@prisma/client";

interface EquipmentWithOwner extends Equipment {
  currentOwner: User | null;
}

interface SearchFilters {
  search?: string;
  category?: string;
  status?: string;
  owner?: string;
  team?: string;
  brand?: string;
  location?: string;
  purchaseMethod?: string;
  priceMin?: number;
  priceMax?: number;
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
  tags?: string;
}

interface SearchResponse {
  equipment: EquipmentWithOwner[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

interface UseEquipmentSearchOptions {
  initialFilters?: SearchFilters;
  pageSize?: number;
  debounceMs?: number;
  autoSearch?: boolean;
}

export function useEquipmentSearch(options: UseEquipmentSearchOptions = {}) {
  const {
    initialFilters = {},
    pageSize = 12,
    debounceMs = 300,
    autoSearch = true,
  } = options;

  const { data: session } = useSession();
  const [equipment, setEquipment] = useState<EquipmentWithOwner[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search function
  const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(
    null
  );

  const searchEquipment = useCallback(
    async (searchFilters: SearchFilters, page: number = 1) => {
      if (!session) {
        setError("Authentication required");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Build search parameters
        const searchParams = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString(),
        });

        // Add filters to search params
        Object.entries(searchFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, value.toString());
          }
        });

        const response = await fetch(`/api/equipment/search?${searchParams}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication required");
          }
          if (response.status === 403) {
            throw new Error("Access denied");
          }
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data: SearchResponse = await response.json();

        setEquipment(data.equipment);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
        setCurrentPage(data.currentPage);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Search failed";
        setError(errorMessage);
        toast.error(errorMessage);
        
        // Reset to empty state on error
        setEquipment([]);
        setTotalCount(0);
        setTotalPages(0);
      } finally {
        setIsLoading(false);
      }
    },
    [session, pageSize]
  );

  // Debounced search effect
  useEffect(() => {
    if (!autoSearch) return;

    // Clear existing timeout
    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId);
    }

    // Set new timeout for debounced search
    const timeoutId = setTimeout(() => {
      searchEquipment(filters, currentPage);
    }, debounceMs);

    setSearchTimeoutId(timeoutId);

    // Cleanup on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [filters, currentPage, searchEquipment, debounceMs, autoSearch]);

  // Update filters function
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  // Clear filters function
  const clearFilters = useCallback(() => {
    setFilters({});
    setCurrentPage(1);
  }, []);

  // Manual search function (for when autoSearch is false)
  const executeSearch = useCallback(() => {
    searchEquipment(filters, currentPage);
  }, [searchEquipment, filters, currentPage]);

  // Pagination functions
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  // Refresh function
  const refresh = useCallback(() => {
    searchEquipment(filters, currentPage);
  }, [searchEquipment, filters, currentPage]);

  // Get equipment by ID (from current results)
  const getEquipmentById = useCallback(
    (id: string) => {
      return equipment.find((item) => item.id === id) || null;
    },
    [equipment]
  );

  // Check if user can perform specific actions
  const permissions = {
    canEdit: session?.user?.role === "admin" || session?.user?.role === "team_lead",
    canAssign: session?.user?.role === "admin" || session?.user?.role === "team_lead",
    canDelete: session?.user?.role === "admin",
    canViewAll: session?.user?.role === "admin" || session?.user?.role === "team_lead",
  };

  return {
    // Data
    equipment,
    filters,
    currentPage,
    totalCount,
    totalPages,
    isLoading,
    error,
    permissions,

    // Actions
    updateFilters,
    clearFilters,
    executeSearch,
    refresh,

    // Pagination
    goToPage,
    goToNextPage,
    goToPreviousPage,

    // Utilities
    getEquipmentById,

    // State
    hasResults: equipment.length > 0,
    hasFilters: Object.keys(filters).length > 0,
    canGoNext: currentPage < totalPages,
    canGoPrevious: currentPage > 1,
  };
}

// Type exports for consumers
export type { SearchFilters, EquipmentWithOwner };