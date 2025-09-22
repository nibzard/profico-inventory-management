// ABOUTME: Main header component for the ProfiCo Inventory Management System
// ABOUTME: Contains navigation, user menu, and system branding with authentication integration

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import { SignOutButton } from "@/components/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, User, Settings, Bell } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationDetailModal, type Notification } from "@/components/notifications/notification-detail-modal";
import { formatDistanceToNow } from "date-fns";

interface HeaderProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuToggle, showMenuButton = true }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const { 
    notifications, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    unreadCount, 
    hasUnread 
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailModalOpen(true);
    setIsNotificationOpen(false);
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={onMenuToggle}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-gray-900">
              ProfiCo Inventory
            </h1>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <PWAInstallPrompt />
          
          {/* Notifications */}
          <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-2">Notifications</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const getBgColor = () => {
                        switch (notification.type) {
                          case "request_approved":
                            return "bg-green-50 border-green-200";
                          case "request_rejected":
                            return "bg-red-50 border-red-200";
                          case "maintenance_due":
                            return "bg-yellow-50 border-yellow-200";
                          case "equipment_assigned":
                            return "bg-blue-50 border-blue-200";
                          default:
                            return "bg-gray-50 border-gray-200";
                        }
                      };

                      return (
                        <div
                          key={notification.id}
                          className={`p-2 rounded-md border cursor-pointer hover:bg-opacity-80 transition-colors ${getBgColor()} ${
                            !notification.read ? 'ring-1 ring-blue-200' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-medium">{notification.title}</p>
                                {!notification.read && (
                                  <Badge variant="secondary" className="text-xs px-1 py-0">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <DropdownMenuSeparator className="my-2" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-sm"
                  onClick={() => {
                    markAllAsRead();
                    setIsNotificationOpen(false);
                  }}
                  disabled={!hasUnread}
                >
                  Mark all as read
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{user.name}</p>
                    <Badge
                      variant={
                        user.role === "admin"
                          ? "default"
                          : user.role === "team_lead"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {user.role?.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <div className="w-full">
                    <SignOutButton />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Notification Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onMarkAsRead={handleMarkAsRead}
      />
    </header>
  );
}
