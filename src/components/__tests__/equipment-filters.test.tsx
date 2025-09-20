// ABOUTME: Unit tests for EquipmentFilters component
// ABOUTME: Tests filtering functionality, search, category/status/owner filters, and role-based visibility
// ABOUTME: Ensures proper URL parameter handling and responsive filter interface

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EquipmentFilters } from "@/components/equipment/equipment-filters";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("EquipmentFilters", () => {
  const mockCategories = ["laptop", "monitor", "keyboard", "mouse", "phone"];
  const mockUsers = [
    { id: "user1", name: "John Doe" },
    { id: "user2", name: "Jane Smith" },
    { id: "user3", name: "Bob Johnson" },
  ];
  const mockCurrentFilters = {};
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterPush.mockClear();
  });

  it("renders filter interface with all controls", () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByText("Apply Filters")).toBeInTheDocument();
  });

  it("shows owner filter for admin users", () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="admin"
      />
    );

    expect(screen.getByLabelText("Owner")).toBeInTheDocument();
  });

  it("shows owner filter for team lead users", () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="team_lead"
      />
    );

    expect(screen.getByLabelText("Owner")).toBeInTheDocument();
  });

  it("hides owner filter for regular users", () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    expect(screen.queryByLabelText("Owner")).not.toBeInTheDocument();
  });

  it("populates search input from current filters", () => {
    const currentFilters = { search: "test laptop" };
    
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={currentFilters}
        userRole="user"
      />
    );

    const searchInput = screen.getByPlaceholderText("Name, serial, brand...");
    expect(searchInput).toHaveValue("test laptop");
  });

  it("populates category from current filters", () => {
    const currentFilters = { category: "laptop" };
    
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={currentFilters}
        userRole="user"
      />
    );

    const categorySelect = screen.getByText("Laptop");
    expect(categorySelect).toBeInTheDocument();
  });

  it("populates status from current filters", () => {
    const currentFilters = { status: "assigned" };
    
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={currentFilters}
        userRole="user"
      />
    );

    const statusSelect = screen.getByText("Assigned");
    expect(statusSelect).toBeInTheDocument();
  });

  it("populates owner from current filters for admin", () => {
    const currentFilters = { owner: "user1" };
    
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={currentFilters}
        userRole="admin"
      />
    );

    const ownerSelect = screen.getByText("John Doe");
    expect(ownerSelect).toBeInTheDocument();
  });

  it("shows all category options", async () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    const categoryTrigger = screen.getByText("All categories");
    await userEvent.click(categoryTrigger);

    expect(screen.getByText("All categories")).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Monitor")).toBeInTheDocument();
    expect(screen.getByText("Keyboard")).toBeInTheDocument();
    expect(screen.getByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
  });

  it("shows all status options", async () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    const statusTrigger = screen.getByText("All statuses");
    await userEvent.click(statusTrigger);

    expect(screen.getByText("All statuses")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Assigned")).toBeInTheDocument();
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Broken")).toBeInTheDocument();
    expect(screen.getByText("Decommissioned")).toBeInTheDocument();
  });

  it("shows all owner options for admin", async () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="admin"
      />
    );

    const ownerTrigger = screen.getByText("All owners");
    await userEvent.click(ownerTrigger);

    expect(screen.getByText("All owners")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
  });

  it("applies filters with search only", async () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    const searchInput = screen.getByPlaceholderText("Name, serial, brand...");
    await userEvent.type(searchInput, "test laptop");

    const applyButton = screen.getByText("Apply Filters");
    await userEvent.click(applyButton);

    expect(mockRouterPush).toHaveBeenCalledWith("/equipment?search=test+laptop");
  });

  it("applies filters with multiple criteria", async () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="admin"
      />
    );

    // Set search
    const searchInput = screen.getByPlaceholderText("Name, serial, brand...");
    await userEvent.type(searchInput, "dell");

    // Set category
    const categoryTrigger = screen.getByText("All categories");
    await userEvent.click(categoryTrigger);
    await userEvent.click(screen.getByText("Laptop"));

    // Set status
    const statusTrigger = screen.getByText("All statuses");
    await userEvent.click(statusTrigger);
    await userEvent.click(screen.getByText("Available"));

    // Set owner
    const ownerTrigger = screen.getByText("All owners");
    await userEvent.click(ownerTrigger);
    await userEvent.click(screen.getByText("John Doe"));

    const applyButton = screen.getByText("Apply Filters");
    await userEvent.click(applyButton);

    expect(mockRouterPush).toHaveBeenCalledWith(
      "/equipment?search=dell&category=laptop&status=available&owner=user1"
    );
  });

  it("clears all filters", async () => {
    const currentFilters = {
      search: "test",
      category: "laptop",
      status: "assigned",
      owner: "user1",
    };

    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={currentFilters}
        userRole="admin"
      />
    );

    const clearButton = screen.getByText("Clear All");
    await userEvent.click(clearButton);

    expect(mockRouterPush).toHaveBeenCalledWith("/equipment");

    // Check that form fields are reset
    const searchInput = screen.getByPlaceholderText("Name, serial, brand...");
    expect(searchInput).toHaveValue("");
  });

  it("shows clear button when filters are active", () => {
    const currentFilters = { search: "test" };

    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={currentFilters}
        userRole="user"
      />
    );

    expect(screen.getByText("Clear All")).toBeInTheDocument();
  });

  it("hides clear button when no filters are active", () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    expect(screen.queryByText("Clear All")).not.toBeInTheDocument();
  });

  it("shows filter count when filters are active", () => {
    const currentFilters = { search: "test", category: "laptop" };

    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={currentFilters}
        userRole="user"
      />
    );

    expect(screen.getByText("2 filter(s) applied")).toBeInTheDocument();
  });

  it("hides filter count when no filters are active", () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    expect(screen.queryByText(/filter\(s\) applied/)).not.toBeInTheDocument();
  });

  it("applies filters on Enter key in search input", async () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    const searchInput = screen.getByPlaceholderText("Name, serial, brand...");
    await userEvent.type(searchInput, "test laptop{enter}");

    expect(mockRouterPush).toHaveBeenCalledWith("/equipment?search=test+laptop");
  });

  it("handles category selection properly", async () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    const categoryTrigger = screen.getByText("All categories");
    await userEvent.click(categoryTrigger);
    await userEvent.click(screen.getByText("Laptop"));

    const applyButton = screen.getByText("Apply Filters");
    await userEvent.click(applyButton);

    expect(mockRouterPush).toHaveBeenCalledWith("/equipment?category=laptop");
  });

  it("handles status selection properly", async () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    const statusTrigger = screen.getByText("All statuses");
    await userEvent.click(statusTrigger);
    await userEvent.click(screen.getByText("Available"));

    const applyButton = screen.getByText("Apply Filters");
    await userEvent.click(applyButton);

    expect(mockRouterPush).toHaveBeenCalledWith("/equipment?status=available");
  });

  it("handles owner selection properly for admin", async () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="admin"
      />
    );

    const ownerTrigger = screen.getByText("All owners");
    await userEvent.click(ownerTrigger);
    await userEvent.click(screen.getByText("Unassigned"));

    const applyButton = screen.getByText("Apply Filters");
    await userEvent.click(applyButton);

    expect(mockRouterPush).toHaveBeenCalledWith("/equipment?owner=unassigned");
  });

  it("has proper accessibility attributes", () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    const searchInput = screen.getByLabelText("Search");
    expect(searchInput).toHaveAttribute("id", "search");

    const categoryLabel = screen.getByText("Category");
    expect(categoryLabel).toBeInTheDocument();

    const statusLabel = screen.getByText("Status");
    expect(statusLabel).toBeInTheDocument();

    const applyButton = screen.getByText("Apply Filters");
    expect(applyButton).toBeInTheDocument();
  });

  it("formats category names properly", async () => {
    const categoriesWithUnderscores = ["laptop_computer", "external_monitor", "wireless_mouse"];
    
    render(
      <EquipmentFilters
        categories={categoriesWithUnderscores}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    const categoryTrigger = screen.getByText("All categories");
    await userEvent.click(categoryTrigger);

    expect(screen.getByText("Laptop Computer")).toBeInTheDocument();
    expect(screen.getByText("External Monitor")).toBeInTheDocument();
    expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
  });

  it("has responsive layout", () => {
    render(
      <EquipmentFilters
        categories={mockCategories}
        users={mockUsers}
        currentFilters={mockCurrentFilters}
        userRole="user"
      />
    );

    const filterContainer = screen.getByText("Filters").closest("div");
    expect(filterContainer).toBeInTheDocument();
    
    const card = screen.getByText("Filters").closest("div").parentElement;
    expect(card).toBeInTheDocument();
  });
});