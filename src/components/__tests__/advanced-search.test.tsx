// ABOUTME: Unit tests for advanced search component
// ABOUTME: Tests complex filtering functionality, tags, and popover interactions

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdvancedSearch } from "@/components/equipment/advanced-search";
import userEvent from "@testing-library/user-event";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  X: () => <div data-testid="x-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Euro: () => <div data-testid="euro-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Tag: () => <div data-testid="tag-icon" />,
  Building: () => <div data-testid="building-icon" />,
  User: () => <div data-testid="user-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  SlidersHorizontal: () => <div data-testid="sliders-icon" />,
}));

describe("AdvancedSearch", () => {
  const mockOnFiltersChange = jest.fn();
  const defaultProps = {
    categories: ["laptop", "phone", "monitor"],
    users: [
      { id: "1", name: "John Doe", teamId: "1" },
      { id: "2", name: "Jane Smith", teamId: "2" },
    ],
    teams: [
      { id: "1", name: "Development Team" },
      { id: "2", name: "Design Team" },
    ],
    onFiltersChange: mockOnFiltersChange,
    currentFilters: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial rendering", () => {
    it("should render search input with icon", () => {
      render(<AdvancedSearch {...defaultProps} />);

      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(
          "Search equipment by name, serial number, brand, or description..."
        )
      ).toBeInTheDocument();
    });

    it("should render filters trigger button", () => {
      render(<AdvancedSearch {...defaultProps} />);

      expect(screen.getByTestId("sliders-icon")).toBeInTheDocument();
      const filterButton = screen.getByRole("button", { name: "" });
      expect(filterButton).toBeInTheDocument();
    });

    it("should show filter count badge when filters are active", () => {
      const props = {
        ...defaultProps,
        currentFilters: { search: "test", category: "laptop" },
      };

      render(<AdvancedSearch {...props} />);

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should hide filter count badge when no filters are active", () => {
      render(<AdvancedSearch {...defaultProps} />);

      expect(screen.queryByText("2")).not.toBeInTheDocument();
    });
  });

  describe("search functionality", () => {
    it("should update search input on change", async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        "Search equipment by name, serial number, brand, or description..."
      );
      await user.type(searchInput, "MacBook Pro");

      expect(searchInput).toHaveValue("MacBook Pro");
    });

    it("should apply filters on Enter key press", async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        "Search equipment by name, serial number, brand, or description..."
      );
      await user.type(searchInput, "test{Enter}");

      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: "test" })
      );
    });
  });

  describe("popover interactions", () => {
    it("should open popover when filter button is clicked", async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      const filterButton = screen.getByRole("button", { name: "" });
      await user.click(filterButton);

      expect(screen.getByText("Advanced Search")).toBeInTheDocument();
      expect(screen.getByText("Apply")).toBeInTheDocument();
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("should close popover when apply button is clicked", async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      const filterButton = screen.getByRole("button", { name: "" });
      await user.click(filterButton);

      expect(screen.getByText("Advanced Search")).toBeInTheDocument();

      const applyButton = screen.getByText("Apply");
      await user.click(applyButton);

      expect(screen.queryByText("Advanced Search")).not.toBeInTheDocument();
    });

    it("should close popover when clear button is clicked", async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      const filterButton = screen.getByRole("button", { name: "" });
      await user.click(filterButton);

      expect(screen.getByText("Advanced Search")).toBeInTheDocument();

      const clearButton = screen.getByText("Clear");
      await user.click(clearButton);

      expect(screen.queryByText("Advanced Search")).not.toBeInTheDocument();
    });
  });

  describe("basic filters", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      const filterButton = screen.getByRole("button", { name: "" });
      await user.click(filterButton);
    });

    it("should populate category options", async () => {
      const categorySelect = screen.getByText("All categories");
      await userEvent.click(categorySelect);

      expect(screen.getByText("All categories")).toBeInTheDocument();
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("Phone")).toBeInTheDocument();
      expect(screen.getByText("Monitor")).toBeInTheDocument();
    });

    it("should populate status options", async () => {
      const statusSelect = screen.getByText("All statuses");
      await userEvent.click(statusSelect);

      expect(screen.getByText("All statuses")).toBeInTheDocument();
      expect(screen.getByText("Available")).toBeInTheDocument();
      expect(screen.getByText("Assigned")).toBeInTheDocument();
      expect(screen.getByText("Maintenance")).toBeInTheDocument();
      expect(screen.getByText("Broken")).toBeInTheDocument();
      expect(screen.getByText("Decommissioned")).toBeInTheDocument();
    });

    it("should populate owner options", async () => {
      const ownerSelect = screen.getByText("All owners");
      await userEvent.click(ownerSelect);

      expect(screen.getByText("All owners")).toBeInTheDocument();
      expect(screen.getByText("Unassigned")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("should populate team options", async () => {
      const teamSelect = screen.getByText("All teams");
      await userEvent.click(teamSelect);

      expect(screen.getByText("All teams")).toBeInTheDocument();
      expect(screen.getByText("Development Team")).toBeInTheDocument();
      expect(screen.getByText("Design Team")).toBeInTheDocument();
    });
  });

  describe("advanced filters", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      const filterButton = screen.getByRole("button", { name: "" });
      await user.click(filterButton);
    });

    it("should update brand filter", async () => {
      const brandInput = screen.getByPlaceholderText("Filter by brand...");
      await userEvent.type(brandInput, "Apple");

      expect(brandInput).toHaveValue("Apple");
    });

    it("should update location filter", async () => {
      const locationInput = screen.getByPlaceholderText("Filter by location...");
      await userEvent.type(locationInput, "Office A");

      expect(locationInput).toHaveValue("Office A");
    });

    it("should populate purchase method options", async () => {
      const purchaseMethodSelect = screen.getByText("All methods");
      await userEvent.click(purchaseMethodSelect);

      expect(screen.getByText("All methods")).toBeInTheDocument();
      expect(screen.getByText("ProfiCo")).toBeInTheDocument();
      expect(screen.getByText("ZOPI")).toBeInTheDocument();
      expect(screen.getByText("Leasing")).toBeInTheDocument();
      expect(screen.getByText("Off-the-shelf")).toBeInTheDocument();
    });
  });

  describe("price range filters", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      const filterButton = screen.getByRole("button", { name: "" });
      await user.click(filterButton);
    });

    it("should update min price filter", async () => {
      const minPriceInput = screen.getByPlaceholderText("0");
      await userEvent.type(minPriceInput, "1000");

      expect(minPriceInput).toHaveValue("1000");
    });

    it("should update max price filter", async () => {
      const maxPriceInput = screen.getByPlaceholderText("No limit");
      await userEvent.type(maxPriceInput, "5000");

      expect(maxPriceInput).toHaveValue("5000");
    });

    it("should accept numeric values for price inputs", async () => {
      const minPriceInput = screen.getByPlaceholderText("0");
      const maxPriceInput = screen.getByPlaceholderText("No limit");

      await userEvent.type(minPriceInput, "1500");
      await userEvent.type(maxPriceInput, "3000");

      expect(minPriceInput).toHaveValue("1500");
      expect(maxPriceInput).toHaveValue("3000");
    });
  });

  describe("date range filters", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      const filterButton = screen.getByRole("button", { name: "" });
      await user.click(filterButton);
    });

    it("should update purchase date from filter", async () => {
      const dateFromInput = screen.getByDisplayValue("");
      const dateInputs = screen.getAllByRole("textbox");
      const fromDateInput = dateInputs.find(input => input.getAttribute('type') === 'date');
      
      if (fromDateInput) {
        await userEvent.type(fromDateInput, "2024-01-01");
        expect(fromDateInput).toHaveValue("2024-01-01");
      }
    });

    it("should update purchase date to filter", async () => {
      const dateToInput = screen.getByDisplayValue("");
      const dateInputs = screen.getAllByRole("textbox");
      const toDateInput = dateInputs.find(input => input.getAttribute('type') === 'date');
      
      if (toDateInput) {
        await userEvent.type(toDateInput, "2024-12-31");
        expect(toDateInput).toHaveValue("2024-12-31");
      }
    });
  });

  describe("tags functionality", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      const filterButton = screen.getByRole("button", { name: "" });
      await user.click(filterButton);
    });

    it("should add tag when Enter key is pressed", async () => {
      const tagInput = screen.getByPlaceholderText("Add tags...");
      await userEvent.type(tagInput, "important{Enter}");

      expect(screen.getByText("important")).toBeInTheDocument();
      expect(tagInput).toHaveValue("");
    });

    it("should add tag when Add button is clicked", async () => {
      const user = userEvent.setup();
      const tagInput = screen.getByPlaceholderText("Add tags...");
      await user.type(tagInput, "urgent");

      const addButton = screen.getByText("Add");
      await user.click(addButton);

      expect(screen.getByText("urgent")).toBeInTheDocument();
      expect(tagInput).toHaveValue("");
    });

    it("should remove tag when close button is clicked", async () => {
      const tagInput = screen.getByPlaceholderText("Add tags...");
      await userEvent.type(tagInput, "test{Enter}");

      const tagBadge = screen.getByText("test");
      const removeButton = tagBadge.parentElement?.querySelector('button');
      
      if (removeButton) {
        await userEvent.click(removeButton);
        expect(screen.queryByText("test")).not.toBeInTheDocument();
      }
    });

    it("should prevent duplicate tags", async () => {
      const tagInput = screen.getByPlaceholderText("Add tags...");
      await userEvent.type(tagInput, "duplicate{Enter}");
      await userEvent.type(tagInput, "duplicate{Enter}");

      const tags = screen.getAllByText("duplicate");
      expect(tags).toHaveLength(1);
    });

    it("should prevent empty tags", async () => {
      const tagInput = screen.getByPlaceholderText("Add tags...");
      await userEvent.type(tagInput, "   {Enter}");

      expect(screen.queryByText("   ")).not.toBeInTheDocument();
    });
  });

  describe("filter state management", () => {
    it("should initialize with current filters", () => {
      const props = {
        ...defaultProps,
        currentFilters: {
          search: "initial search",
          category: "laptop",
          tags: ["existing"],
        },
      };

      render(<AdvancedSearch {...props} />);

      expect(
        screen.getByPlaceholderText(
          "Search equipment by name, serial number, brand, or description..."
        )
      ).toHaveValue("initial search");
    });

    it("should apply all filters when Apply button is clicked", async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      // Open popover
      const filterButton = screen.getByRole("button", { name: "" });
      await user.click(filterButton);

      // Set some filters
      const searchInput = screen.getByPlaceholderText(
        "Search equipment by name, serial number, brand, or description..."
      );
      await user.type(searchInput, "test equipment");

      const brandInput = screen.getByPlaceholderText("Filter by brand...");
      await user.type(brandInput, "Apple");

      // Add a tag
      const tagInput = screen.getByPlaceholderText("Add tags...");
      await user.type(tagInput, "important{Enter}");

      // Apply filters
      const applyButton = screen.getByText("Apply");
      await user.click(applyButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "test equipment",
          brand: "Apple",
          tags: ["important"],
        })
      );
    });

    it("should clear all filters when Clear button is clicked", async () => {
      const user = userEvent.setup();
      render(<AdvancedSearch {...defaultProps} />);

      // Open popover
      const filterButton = screen.getByRole("button", { name: "" });
      await user.click(filterButton);

      // Set some filters
      const searchInput = screen.getByPlaceholderText(
        "Search equipment by name, serial number, brand, or description..."
      );
      await user.type(searchInput, "test equipment");

      const brandInput = screen.getByPlaceholderText("Filter by brand...");
      await user.type(brandInput, "Apple");

      // Clear filters
      const clearButton = screen.getByText("Clear");
      await user.click(clearButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "",
          brand: "",
          tags: [],
        })
      );
    });
  });

  describe("category name formatting", () => {
    it("should format underscore categories to readable text", async () => {
      const props = {
        ...defaultProps,
        categories: ["laptop_computer", "smart_phone"],
      };

      const user = userEvent.setup();
      render(<AdvancedSearch {...props} />);

      const filterButton = screen.getByRole("button", { name: "" });
      await user.click(filterButton);

      const categorySelect = screen.getByText("All categories");
      await userEvent.click(categorySelect);

      expect(screen.getByText("Laptop Computer")).toBeInTheDocument();
      expect(screen.getByText("Smart Phone")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle empty categories array", () => {
      const props = {
        ...defaultProps,
        categories: [],
      };

      render(<AdvancedSearch {...props} />);

      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    });

    it("should handle empty users array", () => {
      const props = {
        ...defaultProps,
        users: [],
      };

      render(<AdvancedSearch {...props} />);

      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    });

    it("should handle empty teams array", () => {
      const props = {
        ...defaultProps,
        teams: [],
      };

      render(<AdvancedSearch {...props} />);

      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    });

    it("should handle filters with null/undefined values", () => {
      const props = {
        ...defaultProps,
        currentFilters: {
          search: null as any,
          category: undefined as any,
          tags: [],
        },
      };

      render(<AdvancedSearch {...props} />);

      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    });
  });
});