// ABOUTME: Custom hook for managing notifications state and actions
// ABOUTME: Handles notification fetching, marking as read, and real-time updates

"use client";

import { useState, useEffect } from 'react';
import type { Notification } from '@/components/notifications/notification-detail-modal';

// Mock notifications for now - in a real app, these would come from an API
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "request_approved",
    title: "Equipment Request Approved",
    message: "Your request for MacBook Pro has been approved by the admin team. You can expect to receive your equipment within 2-3 business days. Please ensure you're available to complete the handover process.",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
    relatedId: "req-123",
    relatedType: "request",
    actionUrl: "/requests/req-123",
    priority: "medium",
    metadata: {
      equipmentType: "MacBook Pro",
      approvedBy: "John Admin",
      requestDate: "2024-01-15",
      deliveryETA: "2-3 business days"
    }
  },
  {
    id: "2",
    type: "maintenance_due",
    title: "Maintenance Due",
    message: "Scheduled maintenance is required for your assigned laptop (Dell XPS 13). Please schedule a maintenance appointment within the next 7 days to ensure optimal performance and warranty compliance.",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    relatedId: "eq-456",
    relatedType: "equipment",
    actionUrl: "/equipment/eq-456",
    priority: "high",
    metadata: {
      equipmentName: "Dell XPS 13",
      serialNumber: "DXS123456",
      lastMaintenance: "2023-07-15",
      maintenanceType: "Preventive"
    }
  },
  {
    id: "3",
    type: "equipment_assigned",
    title: "New Equipment Assigned",
    message: "You have been assigned a new piece of equipment: iPhone 14 Pro. Please confirm receipt and complete the equipment handover checklist within 48 hours.",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    read: true,
    relatedId: "eq-789",
    relatedType: "equipment",
    actionUrl: "/equipment/eq-789",
    priority: "medium",
    metadata: {
      equipmentName: "iPhone 14 Pro",
      serialNumber: "IP14789123",
      assignedBy: "Sarah Manager",
      handoverDeadline: "48 hours"
    }
  }
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate API fetch
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(mockNotifications);
      setIsLoading(false);
    };

    fetchNotifications();
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const hasUnread = unreadCount > 0;

  return {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount,
    hasUnread,
    // For real-time updates
    refetch: () => {
      // In a real app, this would refetch from the API
      console.log('Refetching notifications...');
    }
  };
}