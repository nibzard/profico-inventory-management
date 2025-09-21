// ABOUTME: Navigation sidebar component for the ProfiCo Inventory Management System
// ABOUTME: Contains main navigation links and role-based menu items

export function Sidebar() {
  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "🏠" },
    { label: "Equipment", href: "/equipment", icon: "💻" },
    { label: "Equipment Management", href: "/equipment/management", icon: "⚙️" },
    { label: "Requests", href: "/requests", icon: "📋" },
    { label: "Subscriptions", href: "/subscriptions", icon: "💿" },
    { label: "Reports", href: "/reports", icon: "📊" },
    { label: "Users", href: "/users", icon: "👥" },
  ];

  return (
    <aside className="bg-gray-50 border-r border-gray-200 w-64 min-h-screen">
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
