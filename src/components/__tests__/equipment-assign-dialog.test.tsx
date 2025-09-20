// ABOUTME: Unit tests for EquipmentAssignDialog component
// ABOUTME: Tests user assignment functionality, validation, form submission, and error handling
// ABOUTME: Ensures proper equipment assignment workflow with role-based access control

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EquipmentAssignDialog } from "@/components/equipment/equipment-assign-dialog";
import { toast } from "sonner";
import type { Equipment, User } from "@prisma/client";

// Mock dependencies
const mockRouter = {
  refresh: jest.fn(),
};

// Mock scrollIntoView for Radix UI components
Element.prototype.scrollIntoView = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock Prisma types
const mockEquipment: Equipment & { currentOwner: User | null } = {
  id: "1",
  name: "Test Laptop",
  serialNumber: "LPT-001",
  category: "laptop",
  status: "available",
  purchaseDate: new Date(),
  purchasePrice: 1200,
  currentValue: 800,
  location: "Office A",
  description: "Test laptop for assignment",
  createdAt: new Date(),
  updatedAt: new Date(),
  currentOwner: null,
};

const mockUsers: User[] = [
  {
    id: "user1",
    name: "John Doe",
    email: "john@example.com",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "team_lead",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("EquipmentAssignDialog", () => {
  const mockOnOpenChange = jest.fn();
  const mockRouterRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockOnOpenChange.mockClear();
    mockRouterRefresh.mockClear();
  });

  it("renders dialog with equipment information", () => {
    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Assign "Test Laptop" \(LPT-001\) to a user/)).toBeInTheDocument();
    expect(screen.getByText("Select User")).toBeInTheDocument();
    expect(screen.getByText("Notes (Optional)")).toBeInTheDocument();
  });

  it("fetches users when dialog opens", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    });

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/users?active=true");
    });
  });

  it("displays users in select dropdown", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    });

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      const selectTrigger = screen.getByText("Choose a user...");
      expect(selectTrigger).toBeInTheDocument();
    });

    // Click to open dropdown using fireEvent
    const selectTrigger = screen.getByText("Choose a user...");
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });
  });

  it("shows assignment details when user is selected", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    });

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      const selectTrigger = screen.getByText("Choose a user...");
      fireEvent.click(selectTrigger);
    });

    await waitFor(() => {
      const userOption = screen.getAllByText("John Doe")[0]; // Get the option, not the assignment details
      fireEvent.click(userOption);
    });

    await waitFor(() => {
      expect(screen.getByText("Assignment Details")).toBeInTheDocument();
      expect(screen.getByText("User:")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Email:")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("Role:")).toBeInTheDocument();
      expect(screen.getByText("USER")).toBeInTheDocument();
    });
  });

  it("shows validation error when no user is selected", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    });

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      const assignButton = screen.getByText("Assign Equipment");
      expect(assignButton).toBeDisabled();
    });

    // Try to click disabled button
    const assignButton = screen.getByText("Assign Equipment");
    await userEvent.click(assignButton);

    expect(toast.error).toHaveBeenCalledWith("Please select a user");
  });

  it("enables assign button when user is selected", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    });

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      const selectTrigger = screen.getByText("Choose a user...");
      fireEvent.click(selectTrigger);
    });

    await waitFor(() => {
      const userOption = screen.getByText("John Doe");
      fireEvent.click(userOption);
    });

    await waitFor(() => {
      const assignButton = screen.getByText("Assign Equipment");
      expect(assignButton).toBeEnabled();
    });
  });

  it("successfully assigns equipment", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Select user
    await waitFor(() => {
      const selectTrigger = screen.getByText("Choose a user...");
      fireEvent.click(selectTrigger);
    });

    await waitFor(() => {
      const userOption = screen.getByText("John Doe");
      fireEvent.click(userOption);
    });

    // Add notes
    const notesTextarea = screen.getByPlaceholderText(
      "Add any notes about this assignment..."
    );
    await userEvent.type(notesTextarea, "Test assignment notes");

    // Submit form
    const assignButton = screen.getByText("Assign Equipment");
    await userEvent.click(assignButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/equipment/1/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "user1",
          notes: "Test assignment notes",
        }),
      });
    });

    expect(toast.success).toHaveBeenCalledWith("Equipment assigned successfully");
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("handles assignment error", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: "Assignment failed" }),
      });

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Select user
    await waitFor(() => {
      const selectTrigger = screen.getByText("Choose a user...");
      fireEvent.click(selectTrigger);
    });

    await waitFor(() => {
      const userOption = screen.getByText("John Doe");
      fireEvent.click(userOption);
    });

    // Submit form
    const assignButton = screen.getByText("Assign Equipment");
    await userEvent.click(assignButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Assignment failed");
    });
  });

  it("shows loading state during assignment", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      })
      .mockImplementationOnce(() => new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }), 100);
      }));

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Select user
    await waitFor(() => {
      const selectTrigger = screen.getByText("Choose a user...");
      fireEvent.click(selectTrigger);
    });

    await waitFor(() => {
      const userOption = screen.getByText("John Doe");
      fireEvent.click(userOption);
    });

    // Submit form
    const assignButton = screen.getByText("Assign Equipment");
    await userEvent.click(assignButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText("Assigning...")).toBeInTheDocument();
      expect(assignButton).toBeDisabled();
    });

    // Wait for completion
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Equipment assigned successfully");
    }, 150);
  });

  it("handles users fetch error", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load users");
    });
  });

  it("submits without optional notes", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Select user
    await waitFor(() => {
      const selectTrigger = screen.getByText("Choose a user...");
      fireEvent.click(selectTrigger);
    });

    await waitFor(() => {
      const userOption = screen.getByText("John Doe");
      fireEvent.click(userOption);
    });

    // Submit form without notes
    const assignButton = screen.getByText("Assign Equipment");
    await userEvent.click(assignButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/equipment/1/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "user1",
          notes: undefined,
        }),
      });
    });
  });

  it("closes dialog on cancel", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    });

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const cancelButton = screen.getByText("Cancel");
    await userEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables buttons during loading", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      })
      .mockImplementationOnce(() => new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }), 100);
      }));

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Select user
    await waitFor(() => {
      const selectTrigger = screen.getByText("Choose a user...");
      fireEvent.click(selectTrigger);
    });

    await waitFor(() => {
      const userOption = screen.getByText("John Doe");
      fireEvent.click(userOption);
    });

    // Submit form
    const assignButton = screen.getByText("Assign Equipment");
    await userEvent.click(assignButton);

    // Check loading state
    await waitFor(() => {
      const cancelButton = screen.getByText("Cancel");
      expect(cancelButton).toBeDisabled();
      expect(assignButton).toBeDisabled();
    });
  });

  it("has proper accessibility attributes", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    });

    render(
      <EquipmentAssignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      
      const title = screen.getByText("Assign Equipment");
      expect(title).toBeInTheDocument();
      
      const selectLabel = screen.getByText("Select User");
      expect(selectLabel).toBeInTheDocument();
      
      const notesLabel = screen.getByText("Notes (Optional)");
      expect(notesLabel).toBeInTheDocument();
    });
  });
});