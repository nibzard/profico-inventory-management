// ABOUTME: Request history and audit trail service for ProfiCo Inventory Management System
// ABOUTME: Provides functions to create and retrieve request audit trail entries

import { prisma } from "@/lib/prisma";

export interface RequestHistoryCreateData {
  requestId: string;
  userId: string;
  action: string;
  oldStatus?: string;
  newStatus?: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface RequestHistoryEntry {
  id: string;
  requestId: string;
  userId: string;
  action: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
  };
}

/**
 * Request history service for tracking all request actions and changes
 */
export class RequestHistoryService {
  /**
   * Create a new history entry for a request
   */
  static async createHistoryEntry(data: RequestHistoryCreateData): Promise<RequestHistoryEntry> {
    try {
      const historyEntry = await prisma.requestHistory.create({
        data: {
          requestId: data.requestId,
          userId: data.userId,
          action: data.action,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          notes: data.notes,
          metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Parse metadata for consistent return format
      const parsedMetadata = historyEntry.metadata ? JSON.parse(historyEntry.metadata) : undefined;

      return {
        ...historyEntry,
        metadata: parsedMetadata,
      };
    } catch (error) {
      console.error("Failed to create request history entry:", error);
      throw new Error("Failed to create request history entry");
    }
  }

  /**
   * Get history for a specific request
   */
  static async getRequestHistory(requestId: string): Promise<RequestHistoryEntry[]> {
    try {
      const history = await prisma.requestHistory.findMany({
        where: { requestId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return history.map((entry) => ({
        ...entry,
        metadata: entry.metadata ? JSON.parse(entry.metadata) : undefined,
      }));
    } catch (error) {
      console.error("Failed to fetch request history:", error);
      throw new Error("Failed to fetch request history");
    }
  }

  /**
   * Get recent history across all requests (for admin dashboard)
   */
  static async getRecentHistory(limit: number = 50): Promise<RequestHistoryEntry[]> {
    try {
      const history = await prisma.requestHistory.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          request: {
            select: {
              id: true,
              equipmentType: true,
              status: true,
              requester: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return history.map((entry) => ({
        ...entry,
        metadata: entry.metadata ? JSON.parse(entry.metadata) : undefined,
      }));
    } catch (error) {
      console.error("Failed to fetch recent request history:", error);
      throw new Error("Failed to fetch recent request history");
    }
  }

  /**
   * Get history for a specific user
   */
  static async getUserHistory(userId: string, limit: number = 100): Promise<RequestHistoryEntry[]> {
    try {
      const history = await prisma.requestHistory.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          request: {
            select: {
              id: true,
              equipmentType: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return history.map((entry) => ({
        ...entry,
        metadata: entry.metadata ? JSON.parse(entry.metadata) : undefined,
      }));
    } catch (error) {
      console.error("Failed to fetch user request history:", error);
      throw new Error("Failed to fetch user request history");
    }
  }

  /**
   * Convenience method to log request creation
   */
  static async logRequestCreation(
    requestId: string,
    userId: string,
    equipmentType: string
  ): Promise<RequestHistoryEntry> {
    return this.createHistoryEntry({
      requestId,
      userId,
      action: "created",
      newStatus: "pending",
      notes: `Request created for: ${equipmentType}`,
      metadata: {
        equipmentType,
      },
    });
  }

  /**
   * Convenience method to log team lead approval
   */
  static async logTeamLeadApproval(
    requestId: string,
    userId: string,
    notes?: string
  ): Promise<RequestHistoryEntry> {
    return this.createHistoryEntry({
      requestId,
      userId,
      action: "team_lead_approved",
      oldStatus: "pending",
      newStatus: "pending", // Still pending admin approval
      notes: notes || "Team lead approved request",
    });
  }

  /**
   * Convenience method to log team lead rejection
   */
  static async logTeamLeadRejection(
    requestId: string,
    userId: string,
    reason: string,
    notes?: string
  ): Promise<RequestHistoryEntry> {
    return this.createHistoryEntry({
      requestId,
      userId,
      action: "team_lead_rejected",
      oldStatus: "pending",
      newStatus: "rejected",
      notes: notes || "Team lead rejected request",
      metadata: {
        rejectionReason: reason,
      },
    });
  }

  /**
   * Convenience method to log admin approval
   */
  static async logAdminApproval(
    requestId: string,
    userId: string,
    notes?: string
  ): Promise<RequestHistoryEntry> {
    return this.createHistoryEntry({
      requestId,
      userId,
      action: "admin_approved",
      oldStatus: "pending",
      newStatus: "approved",
      notes: notes || "Admin approved request",
    });
  }

  /**
   * Convenience method to log admin rejection
   */
  static async logAdminRejection(
    requestId: string,
    userId: string,
    reason: string,
    notes?: string
  ): Promise<RequestHistoryEntry> {
    return this.createHistoryEntry({
      requestId,
      userId,
      action: "admin_rejected",
      oldStatus: "pending",
      newStatus: "rejected",
      notes: notes || "Admin rejected request",
      metadata: {
        rejectionReason: reason,
      },
    });
  }

  /**
   * Convenience method to log equipment assignment
   */
  static async logEquipmentAssignment(
    requestId: string,
    userId: string,
    equipmentId: string,
    equipmentName: string
  ): Promise<RequestHistoryEntry> {
    return this.createHistoryEntry({
      requestId,
      userId,
      action: "equipment_assigned",
      oldStatus: "approved",
      newStatus: "fulfilled",
      notes: `Equipment assigned: ${equipmentName}`,
      metadata: {
        equipmentId,
        equipmentName,
      },
    });
  }

  /**
   * Convenience method to log status changes
   */
  static async logStatusChange(
    requestId: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
    notes?: string
  ): Promise<RequestHistoryEntry> {
    return this.createHistoryEntry({
      requestId,
      userId,
      action: "status_changed",
      oldStatus,
      newStatus,
      notes: notes || `Status changed from ${oldStatus} to ${newStatus}`,
    });
  }

  /**
   * Get action statistics for admin dashboard
   */
  static async getActionStats(): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsToday: number;
    actionsThisWeek: number;
    actionsThisMonth: number;
  }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      const [totalActions, actionsByType, actionsToday, actionsThisWeek, actionsThisMonth] =
        await Promise.all([
          prisma.requestHistory.count(),
          prisma.requestHistory.groupBy({
            by: ["action"],
            _count: { action: true },
          }),
          prisma.requestHistory.count({
            where: { createdAt: { gte: today } },
          }),
          prisma.requestHistory.count({
            where: { createdAt: { gte: weekAgo } },
          }),
          prisma.requestHistory.count({
            where: { createdAt: { gte: monthAgo } },
          }),
        ]);

      const actionCounts = actionsByType.reduce((acc, item) => {
        acc[item.action] = item._count.action;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalActions,
        actionsByType: actionCounts,
        actionsToday,
        actionsThisWeek,
        actionsThisMonth,
      };
    } catch (error) {
      console.error("Failed to get action statistics:", error);
      throw new Error("Failed to get action statistics");
    }
  }
}