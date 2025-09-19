// ABOUTME: Role-based access control component for ProfiCo Inventory Management System
// ABOUTME: Conditionally renders content based on user roles and permissions

"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { type UserRole } from "@/types";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredRole?: UserRole;
  fallback?: ReactNode;
  requireAll?: boolean;
}

export function RoleGuard({
  children,
  allowedRoles,
  requiredRole,
  fallback = null,
  requireAll: _requireAll = false,
}: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  // Show loading state if session is still loading
  if (isLoading) {
    return fallback;
  }

  // If user is not authenticated, don't render content
  if (!user) {
    return fallback;
  }

  const userRole = user.role as UserRole;

  // Check if user has required role
  if (requiredRole && userRole !== requiredRole) {
    return fallback;
  }

  // Check if user role is in allowed roles
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return fallback;
  }

  return <>{children}</>;
}

// Convenience components for common role checks
export function AdminOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["admin"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function ManagersOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["admin", "team_lead"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function AuthenticatedOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={["admin", "team_lead", "user"]}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}
