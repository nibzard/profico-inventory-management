// ABOUTME: Main header component for the ProfiCo Inventory Management System
// ABOUTME: Contains navigation, user menu, and system branding

import PWAInstallPrompt from "@/components/pwa-install-prompt";

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">
            ProfiCo Inventory
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <PWAInstallPrompt />
          <span className="text-sm text-gray-600">Welcome back!</span>
        </div>
      </div>
    </header>
  );
}
