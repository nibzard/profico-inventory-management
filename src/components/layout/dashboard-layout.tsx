// ABOUTME: Main dashboard layout component for the ProfiCo Inventory Management System
// ABOUTME: Provides consistent layout with header, sidebar, and main content area with responsive design

"use client";

import { useState, useEffect } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: "admin" | "team_lead" | "user";
  title?: string;
  description?: string;
}

export function DashboardLayout({ 
  children, 
  userRole = "user", 
  title, 
  description 
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  // Prevent hydration mismatch by ensuring consistent rendering
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar - default state */}
        <div className="fixed inset-y-0 left-0 z-50 md:fixed md:z-30 transition-transform duration-300 ease-in-out -translate-x-full md:translate-x-0">
          <Sidebar 
            userRole={userRole} 
            isOpen={false} 
            onClose={() => {}}
          />
        </div>

        {/* Main content area */}
        <div className="ml-0 md:ml-64">
          <Header onMenuToggle={() => {}} />
          <main className="flex-1">
            {title && (
              <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-6">
                <div className="max-w-7xl mx-auto">
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  {description && (
                    <p className="mt-1 text-sm text-gray-600">{description}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="p-4 lg:p-6">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50",
        "md:fixed md:z-30",
        "transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <Sidebar 
          userRole={userRole} 
          isOpen={sidebarOpen} 
          onClose={closeSidebar}
        />
      </div>

      {/* Main content area */}
      <div className="ml-0 md:ml-64">
        {/* Header */}
        <Header onMenuToggle={toggleSidebar} />

        {/* Page content */}
        <main className="flex-1">
          {title && (
            <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-6">
              <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {description && (
                  <p className="mt-1 text-sm text-gray-600">{description}</p>
                )}
              </div>
            </div>
          )}
          
          <div className="p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}