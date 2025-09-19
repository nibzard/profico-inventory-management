// ABOUTME: Authentication utility functions for ProfiCo Inventory Management System
// ABOUTME: Role-based access control helpers and permission checking functions

import { type UserRole } from "@/types";

export const roleHierarchy: Record<UserRole, number> = {
  user: 1,
  team_lead: 2,
  admin: 3,
};

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canAccessAdminRoutes(userRole: UserRole): boolean {
  return userRole === "admin";
}

export function canApproveRequests(userRole: UserRole): boolean {
  return userRole === "admin" || userRole === "team_lead";
}

export function canManageEquipment(userRole: UserRole): boolean {
  return userRole === "admin" || userRole === "team_lead";
}

export function canViewAllEquipment(userRole: UserRole): boolean {
  return userRole === "admin" || userRole === "team_lead";
}

export function canManageUsers(userRole: UserRole): boolean {
  return userRole === "admin";
}

export function canAccessReports(userRole: UserRole): boolean {
  return userRole === "admin" || userRole === "team_lead";
}

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "team_lead":
      return "Team Lead";
    case "user":
      return "User";
    default:
      return "Unknown";
  }
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Full system access including user management, reports, and system configuration";
    case "team_lead":
      return "Team management, equipment assignment, and request approvals";
    case "user":
      return "Personal equipment view, request equipment, and report issues";
    default:
      return "";
  }
}
