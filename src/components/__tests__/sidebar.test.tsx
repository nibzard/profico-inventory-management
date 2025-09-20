// ABOUTME: Unit tests for Sidebar component - navigation sidebar
// ABOUTME: Tests rendering of navigation items and proper link structure

import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/sidebar";

describe("Sidebar", () => {
  it("should render navigation sidebar with all expected items", () => {
    render(<Sidebar />);

    // Check sidebar container
    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveClass("bg-gray-50", "border-r", "border-gray-200", "w-64", "min-h-screen");

    // Check navigation items
    const navItems = [
      { label: "Dashboard", icon: "🏠", href: "/dashboard" },
      { label: "Equipment", icon: "💻", href: "/equipment" },
      { label: "Requests", icon: "📋", href: "/requests" },
      { label: "Subscriptions", icon: "💿", href: "/subscriptions" },
      { label: "Reports", icon: "📊", href: "/reports" },
      { label: "Users", icon: "👥", href: "/users" },
    ];

    navItems.forEach((item) => {
      const link = screen.getByRole("link", { name: `${item.icon} ${item.label}` });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", item.href);
      
      // Check for icon and label
      expect(link).toHaveTextContent(item.label);
      expect(link).toHaveTextContent(item.icon);
    });

    // Check link styling
    const allLinks = screen.getAllByRole("link");
    allLinks.forEach((link) => {
      expect(link).toHaveClass(
        "flex",
        "items-center",
        "space-x-3",
        "px-3",
        "py-2",
        "rounded-md",
        "text-gray-700",
        "hover:bg-gray-100",
        "transition-colors"
      );
    });
  });

  it("should have correct navigation structure", () => {
    render(<Sidebar />);

    // Check nav element
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();

    // Check unordered list
    const list = nav.querySelector("ul");
    expect(list).toBeInTheDocument();
    expect(list).toHaveClass("space-y-2");

    // Check list items
    const listItems = list?.querySelectorAll("li");
    expect(listItems).toHaveLength(6);
  });

  it("should render with proper accessibility attributes", () => {
    render(<Sidebar />);

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toBeInTheDocument();

    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();

    // All links should be properly labeled
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).toHaveAttribute("href");
      expect(link).toHaveTextContent(/./); // Should have some text content
    });
  });

  it("should maintain consistent styling across all navigation items", () => {
    render(<Sidebar />);

    const links = screen.getAllByRole("link");
    const expectedClasses = [
      "flex",
      "items-center",
      "space-x-3",
      "px-3",
      "py-2",
      "rounded-md",
      "text-gray-700",
      "hover:bg-gray-100",
      "transition-colors",
    ];

    links.forEach((link) => {
      expectedClasses.forEach((className) => {
        expect(link).toHaveClass(className);
      });
    });
  });

  it("should render in a container with fixed width", () => {
    render(<Sidebar />);

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toHaveClass("w-64");
    expect(sidebar).toHaveClass("min-h-screen");
  });
});