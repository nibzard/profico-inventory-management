// ABOUTME: Notification detail modal for showing full notification information
// ABOUTME: Displays detailed notification content with actions and context

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Clock, 
  ExternalLink,
  Calendar,
  User,
  Package
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export interface Notification {
  id: string;
  type: "request_approved" | "request_rejected" | "maintenance_due" | "equipment_assigned" | "info";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  relatedId?: string; // ID of related equipment, request, etc.
  relatedType?: "equipment" | "request" | "user";
  actionUrl?: string;
  priority?: "low" | "medium" | "high";
  metadata?: Record<string, any>;
}

interface NotificationDetailModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead?: (notificationId: string) => void;
}

export function NotificationDetailModal({ 
  notification, 
  isOpen, 
  onClose,
  onMarkAsRead 
}: NotificationDetailModalProps) {
  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case "request_approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "request_rejected":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "maintenance_due":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "equipment_assigned":
        return <Package className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBadgeColor = () => {
    switch (notification.priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleClose = () => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    onClose();
  };

  const getActionButton = () => {
    if (!notification.actionUrl) return null;

    let buttonText = "View Details";
    let buttonIcon = <ExternalLink className="h-4 w-4 ml-2" />;

    switch (notification.relatedType) {
      case "equipment":
        buttonText = "View Equipment";
        buttonIcon = <Package className="h-4 w-4 ml-2" />;
        break;
      case "request":
        buttonText = "View Request";
        buttonIcon = <ExternalLink className="h-4 w-4 ml-2" />;
        break;
      default:
        break;
    }

    return (
      <Button asChild className="w-full">
        <Link href={notification.actionUrl} onClick={handleClose}>
          {buttonText}
          {buttonIcon}
        </Link>
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            <span>{notification.title}</span>
            {notification.priority && (
              <Badge variant={getBadgeColor() as any} className="text-xs">
                {notification.priority.toUpperCase()}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-left">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Calendar className="h-4 w-4" />
              {format(notification.timestamp, "PPp")}
              {!notification.read && (
                <Badge variant="secondary" className="text-xs">
                  New
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm leading-relaxed">
              {notification.message}
            </p>
          </div>

          {notification.metadata && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Details:</h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                {Object.entries(notification.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                    </span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {getActionButton()}
            <Button variant="outline" onClick={handleClose} className="flex-1">
              {notification.read ? "Close" : "Mark as Read"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}