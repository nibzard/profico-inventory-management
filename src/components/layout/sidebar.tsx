// ABOUTME: Navigation sidebar component for the ProfiCo Inventory Management System
// ABOUTME: Contains main navigation links and role-based menu items with authentication integration

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Home,
  Laptop,
  Settings,
  FileText,
  ClipboardList,
  Disc,
  BarChart3,
  Users,
  Package,
  QrCode,
  ScanLine,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface SidebarProps {
  userRole?: "admin" | "team_lead" | "user";
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: ("admin" | "team_lead" | "user")[];
  children?: NavItem[];
}

export function Sidebar({ userRole = "user", isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<string[]>(["equipment"]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const navItems: NavItem[] = [
    { 
      label: "Dashboard", 
      href: "/dashboard", 
      icon: Home 
    },
    {
      label: "Equipment",
      href: "/equipment",
      icon: Laptop,
      children: [
        { label: "All Equipment", href: "/equipment", icon: Package },
        { label: "Add Equipment", href: "/equipment/add", icon: Package, roles: ["admin", "team_lead"] },
        { label: "QR Scanner", href: "/equipment/scanner", icon: ScanLine },
        { label: "Bulk Operations", href: "/equipment/bulk", icon: Settings, roles: ["admin", "team_lead"] },
      ]
    },
    { 
      label: "Requests", 
      href: "/requests", 
      icon: ClipboardList,
      children: [
        { label: "My Requests", href: "/requests", icon: ClipboardList },
        { label: "New Request", href: "/requests/new", icon: ClipboardList },
        { label: "Approve Requests", href: "/requests/approve", icon: ClipboardList, roles: ["admin", "team_lead"] },
      ]
    },
    { 
      label: "Subscriptions", 
      href: "/subscriptions", 
      icon: Disc,
      roles: ["admin", "team_lead"],
      children: [
        { label: "All Subscriptions", href: "/subscriptions", icon: Disc },
        { label: "Add Subscription", href: "/subscriptions/add", icon: Disc },
        { label: "Billing Dashboard", href: "/subscriptions/billing", icon: BarChart3 },
      ]
    },
    { 
      label: "Reports", 
      href: "/admin/reports", 
      icon: BarChart3,
      roles: ["admin", "team_lead"] 
    },
    { 
      label: "Users", 
      href: "/admin/users", 
      icon: Users,
      roles: ["admin"] 
    },
    { 
      label: "Settings", 
      href: "/admin/settings", 
      icon: Settings,
      roles: ["admin"] 
    },
  ];

  const isItemAccessible = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    if (!isItemAccessible(item)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isParentActive = hasChildren && item.children.some(child => isActive(child.href));
    const isCurrentActive = isActive(item.href);
    const sectionKey = item.label.toLowerCase();

    if (hasChildren) {
      return (
        <Collapsible
          key={item.href}
          open={openSections.includes(sectionKey)}
          onOpenChange={() => toggleSection(sectionKey)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between h-auto p-3 text-left font-normal",
                level > 0 && "pl-8",
                (isParentActive || isCurrentActive) && "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
              )}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
              <ChevronRight 
                className={cn(
                  "h-4 w-4 transition-transform",
                  openSections.includes(sectionKey) && "rotate-90"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {item.children.map(child => renderNavItem(child, level + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors",
          level > 0 && "pl-8 ml-6",
          isCurrentActive && "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
        )}
      >
        <item.icon className="h-5 w-5" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <aside 
      className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
        "w-64 min-h-screen flex flex-col",
        "h-full"
      )}
    >
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(item => renderNavItem(item))}
      </nav>
      
      {/* Footer with quick actions */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/equipment/scanner">
              <QrCode className="h-4 w-4 mr-2" />
              Quick Scan
            </Link>
          </Button>
          {(userRole === "admin" || userRole === "team_lead") && (
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/equipment/add">
                <Package className="h-4 w-4 mr-2" />
                Add Equipment
              </Link>
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
