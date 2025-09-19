// ABOUTME: Custom authentication hook for ProfiCo Inventory Management System
// ABOUTME: Provides session data and role-based permission checking

"use client";

import { useSession } from "next-auth/react";
import { type UserRole } from "@/types";
import {
  hasRole,
  canAccessAdminRoutes,
  canApproveRequests,
  canManageEquipment,
  canViewAllEquipment,
  canManageUsers,
  canAccessReports,
} from "@/lib/auth-utils";

export function useAuth() {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isAuthenticated = !!session?.user;
  const user = session?.user;

  // Role checking functions
  const checkRole = (requiredRole: UserRole): boolean => {
    if (!user?.role) return false;
    return hasRole(user.role as UserRole, requiredRole);
  };

  const permissions = {
    canAccessAdmin: user?.role
      ? canAccessAdminRoutes(user.role as UserRole)
      : false,
    canApproveRequests: user?.role
      ? canApproveRequests(user.role as UserRole)
      : false,
    canManageEquipment: user?.role
      ? canManageEquipment(user.role as UserRole)
      : false,
    canViewAllEquipment: user?.role
      ? canViewAllEquipment(user.role as UserRole)
      : false,
    canManageUsers: user?.role ? canManageUsers(user.role as UserRole) : false,
    canAccessReports: user?.role
      ? canAccessReports(user.role as UserRole)
      : false,
  };

  return {
    session,
    user,
    isLoading,
    isAuthenticated,
    checkRole,
    permissions,
  };
}
