// ABOUTME: Unit tests for equipment filters component
// ABOUTME: Tests filtering functionality, search, and role-based features

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EquipmentFilters } from "@/components/equipment/equipment-filters";
import { useRouter, useSearchParams } from "next/navigation";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("EquipmentFilters", () => {
  const mockPush = jest.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  const defaultProps = {
    categories: ["laptop", "phone", "monitor"],
    users: [
      { id: "1", name: "John Doe" },
      { id: "2", name: "Jane Smith" },
    ],
    currentFilters: {},
    userRole: "user",
  };

  describe("rendering", () => {
    it("should render all filter fields", () => {
      render(<EquipmentFilters {...defaultProps} />);

      expect(screen.getByLabelText("Search")).toBeInTheDocument();
      expect(screen.getByLabelText("Category")).toBeInTheDocument();
      expect(screen.getByLabelText("Status")).toBeInTheDocument();
      expect(screen.getByText("Apply Filters")).toBeInTheDocument();
    });

    it("should show owner filter for admin users", () => {
      render(<EquipmentFilters {...defaultProps} userRole="admin" />);

      expect(screen.getByLabelText("Owner")).toBeInTheDocument();
    });

    it("should hide owner filter for regular users", () => {
      render(<EquipmentFilters {...defaultProps} userRole="user" />);

      expect(screen.queryByLabelText("Owner")).not.toBeInTheDocument();
    });

    it("should populate categories in select", () => {
      render(<EquipmentFilters {...defaultProps} />);

      // Click the select trigger specifically, not just any text
      const categorySelect = screen.getByLabelText("Category").closest('[data-testid="select"]');
      const trigger = categorySelect?.querySelector('[data-testid="select-trigger"]');
      fireEvent.click(trigger);
      
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("Phone")).toBeInTheDocument();
      expect(screen.getByText("Monitor")).toBeInTheDocument();
    });

    it("should populate status options", () => {
      render(<EquipmentFilters {...defaultProps} />);

      // Click the status select trigger specifically
      const statusSelect = screen.getByLabelText("Status").closest('[data-testid="select"]');
      const trigger = statusSelect?.querySelector('[data-testid="select-trigger"]');
      fireEvent.click(trigger);
      
      expect(screen.getByText("Available")).toBeInTheDocument();
      expect(screen.getByText("Assigned")).toBeInTheDocument();
      expect(screen.getByText("Maintenance")).toBeInTheDocument();
    });
  });

  describe("filter state management", () => {
    it("should initialize with current filters", () => {
      const props = {
        ...defaultProps,
        currentFilters: {
          search: "test search",
          category: "laptop",
          status: "available",
          owner: "1",
        },
      };

      render(<EquipmentFilters {...props} />);

      expect(screen.getByDisplayValue("test search")).toBeInTheDocument();
      // Note: Select values are harder to test directly due to Radix UI implementation
    });

    it("should update search input on change", () => {
      render(<EquipmentFilters {...defaultProps} />);

      const searchInput = screen.getByLabelText("Search");
      fireEvent.change(searchInput, { target: { value: "new search" } });

      expect(searchInput).toHaveValue("new search");
    });

    it("should apply filters on button click", () => {
      render(<EquipmentFilters {...defaultProps} />);

      const searchInput = screen.getByLabelText("Search");
      fireEvent.change(searchInput, { target: { value: "test equipment" } });

      fireEvent.click(screen.getByText("Apply Filters"));

      expect(mockPush).toHaveBeenCalledWith(
        "/equipment?search=test+equipment"
      );
    });

    it("should apply filters on Enter key in search input", () => {
      render(<EquipmentFilters {...defaultProps} />);

      const searchInput = screen.getByLabelText("Search");
      fireEvent.change(searchInput, { target: { value: "test equipment" } });
      fireEvent.keyDown(searchInput, { key: "Enter" });

      expect(mockPush).toHaveBeenCalledWith(
        "/equipment?search=test+equipment"
      );
    });

    it("should include category in filter params", async () => {
      render(<EquipmentFilters {...defaultProps} />);

      // Open category select using proper selector
      const categorySelect = screen.getByLabelText("Category").closest('[data-testid="select"]');
      const categoryTrigger = categorySelect?.querySelector('[data-testid="select-trigger"]');
      fireEvent.click(categoryTrigger);

      // Select laptop category
      const laptopOption = await screen.findByText("Laptop");
      fireEvent.click(laptopOption);

      fireEvent.click(screen.getByText("Apply Filters"));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("category=laptop")
      );
    });

    it("should include status in filter params", async () => {
      render(<EquipmentFilters {...defaultProps} />);

      // Open status select using proper selector
      const statusSelect = screen.getByLabelText("Status").closest('[data-testid="select"]');
      const statusTrigger = statusSelect?.querySelector('[data-testid="select-trigger"]');
      fireEvent.click(statusTrigger);

      // Select available status
      const availableOption = await screen.findByText("Available");
      fireEvent.click(availableOption);

      fireEvent.click(screen.getByText("Apply Filters"));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("status=available")
      );
    });

    it("should include owner in filter params for admin", async () => {
      render(<EquipmentFilters {...defaultProps} userRole="admin" />);

      // Open owner select using proper selector
      const ownerSelect = screen.getByLabelText("Owner").closest('[data-testid="select"]');
      const ownerTrigger = ownerSelect?.querySelector('[data-testid="select-trigger"]');
      fireEvent.click(ownerTrigger);

      // Select first user
      const userOption = await screen.findByText("John Doe");
      fireEvent.click(userOption);

      fireEvent.click(screen.getByText("Apply Filters"));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("owner=1")
      );
    });
  });

  describe("clear filters", () => {
    it("should show clear filters button when filters are active", () => {
      const props = {
        ...defaultProps,
        currentFilters: { search: "test" },
      };

      render(<EquipmentFilters {...props} />);

      expect(screen.getByText("Clear All")).toBeInTheDocument();
    });

    it("should hide clear filters button when no filters are active", () => {
      render(<EquipmentFilters {...defaultProps} />);

      expect(screen.queryByText("Clear All")).not.toBeInTheDocument();
    });

    it("should clear all filters on clear button click", () => {
      const props = {
        ...defaultProps,
        currentFilters: { search: "test", category: "laptop" },
      };

      render(<EquipmentFilters {...props} />);

      fireEvent.click(screen.getByText("Clear All"));

      expect(mockPush).toHaveBeenCalledWith("/equipment");
    });

    it("should reset local state on clear", () => {
      const props = {
        ...defaultProps,
        currentFilters: { search: "test" },
      };

      render(<EquipmentFilters {...props} />);

      const searchInput = screen.getByLabelText("Search");
      expect(searchInput).toHaveValue("test");

      fireEvent.click(screen.getByText("Clear All"));

      expect(searchInput).toHaveValue("");
    });
  });

  describe("filter count display", () => {
    it("should show filter count when filters are applied", () => {
      const props = {
        ...defaultProps,
        currentFilters: { search: "test", category: "laptop", status: "available" },
      };

      render(<EquipmentFilters {...props} />);

      expect(screen.getByText("3 filter(s) applied")).toBeInTheDocument();
    });

    it("should hide filter count when no filters are applied", () => {
      render(<EquipmentFilters {...defaultProps} />);

      expect(screen.queryByText(/filter\(s\) applied/)).not.toBeInTheDocument();
    });
  });

  describe("category name formatting", () => {
    it("should format underscore categories to readable text", () => {
      const props = {
        ...defaultProps,
        categories: ["laptop_computer", "smart_phone"],
      };

      render(<EquipmentFilters {...props} />);

      // Click the category select trigger specifically
      const categorySelect = screen.getByLabelText("Category").closest('[data-testid="select"]');
      const trigger = categorySelect?.querySelector('[data-testid="select-trigger"]');
      fireEvent.click(trigger);
      
      expect(screen.getByText("Laptop Computer")).toBeInTheDocument();
      expect(screen.getByText("Smart Phone")).toBeInTheDocument();
    });

    it("should capitalize category names properly", () => {
      const props = {
        ...defaultProps,
        categories: ["test_category"],
      };

      render(<EquipmentFilters {...props} />);

      // Click the category select trigger specifically
      const categorySelect = screen.getByLabelText("Category").closest('[data-testid="select"]');
      const trigger = categorySelect?.querySelector('[data-testid="select-trigger"]');
      fireEvent.click(trigger);
      
      expect(screen.getByText("Test Category")).toBeInTheDocument();
    });
  });

  describe("unassigned owner option", () => {
    it("should show unassigned option for admin users", () => {
      render(<EquipmentFilters {...defaultProps} userRole="admin" />);

      // Click the owner select trigger specifically
      const ownerSelect = screen.getByLabelText("Owner").closest('[data-testid="select"]');
      const trigger = ownerSelect?.querySelector('[data-testid="select-trigger"]');
      fireEvent.click(trigger);
      
      expect(screen.getByText("Unassigned")).toBeInTheDocument();
    });

    it("should not show unassigned option for regular users", () => {
      render(<EquipmentFilters {...defaultProps} userRole="user" />);

      expect(screen.queryByText("All owners")).not.toBeInTheDocument();
    });
  });
});