// ABOUTME: Approval queue page for team leads and admins to review pending requests
// ABOUTME: Shows requests needing approval based on user role with filtering and actions

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { ApprovalDashboard } from "@/components/requests/approval-dashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, Filter } from "lucide-react";
import Link from "next/link";
import type { EquipmentRequest, User, Equipment } from "@prisma/client";

interface RequestWithRelations extends EquipmentRequest {
  requester: User;
  approver: User | null;
  equipment: Equipment | null;
}

interface SearchParams {
  status?: string;
  page?: string;
}

export default async function ApprovalQueuePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { user } = session;

  // Check if user has approval permissions
  if (user.role === "user") {
    redirect("/requests");
  }

  // Get today's date for stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Build approval queue filters based on user role
  let pendingWhereClause: Record<string, unknown> = {};
  let myApprovalsWhereClause: Record<string, unknown> = {};

  if (user.role === "team_lead") {
    // Team leads see requests needing their approval
    pendingWhereClause = {
      status: "pending",
      teamLeadApproval: null,
    };
    myApprovalsWhereClause = {
      approverId: user.id,
    };
  } else if (user.role === "admin") {
    // Admins see requests that have team lead approval but need admin approval
    pendingWhereClause = {
      status: "pending",
      teamLeadApproval: true,
      adminApproval: null,
    };
    myApprovalsWhereClause = {
      approverId: user.id,
    };
  }

  // Fetch all needed data
  const [
    pendingRequests,
    myApprovals,
    totalPending,
    myPending,
    approvedToday,
    rejectedToday,
  ] = await Promise.all([
    // All pending requests visible to this user
    db.equipmentRequest.findMany({
      where: pendingWhereClause,
      include: {
        requester: {
          select: { id: true, name: true, email: true, role: true, image: true },
        },
        approver: {
          select: { id: true, name: true, email: true, role: true },
        },
        equipment: {
          select: { id: true, name: true, serialNumber: true },
        },
      },
      orderBy: [
        { priority: "desc" }, // Higher priority first
        { createdAt: "asc" },  // Older requests first within same priority
      ],
    }),
    
    // User's approval history
    db.equipmentRequest.findMany({
      where: myApprovalsWhereClause,
      include: {
        requester: {
          select: { id: true, name: true, email: true, role: true, image: true },
        },
        approver: {
          select: { id: true, name: true, email: true, role: true },
        },
        equipment: {
          select: { id: true, name: true, serialNumber: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50, // Limit to recent approvals
    }),
    
    // Stats
    db.equipmentRequest.count({ where: pendingWhereClause }),
    db.equipmentRequest.count({ 
      where: { 
        ...pendingWhereClause,
        ...(user.role === "team_lead" ? { teamLeadApproval: null } : {}),
        ...(user.role === "admin" ? { 
          teamLeadApproval: true, 
          adminApproval: null 
        } : {}),
      }
    }),
    db.equipmentRequest.count({
      where: {
        approverId: user.id,
        status: "approved",
        updatedAt: { gte: today, lt: tomorrow },
      },
    }),
    db.equipmentRequest.count({
      where: {
        approverId: user.id,
        status: "rejected",
        updatedAt: { gte: today, lt: tomorrow },
      },
    }),
  ]);

  // Calculate average approval time (placeholder - would need more complex calculation)
  const avgApprovalTime = 2.4; // hours

  const stats = {
    totalPending,
    myPending,
    approvedToday,
    rejectedToday,
    avgApprovalTime,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <ApprovalDashboard
        pendingRequests={pendingRequests}
        myApprovals={myApprovals}
        stats={stats}
        userRole={user.role}
        userId={user.id}
      />
    </div>
  );
}