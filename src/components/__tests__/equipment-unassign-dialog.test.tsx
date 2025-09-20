// ABOUTME: Unit tests for EquipmentUnassignDialog component
// ABOUTME: Tests equipment unassignment workflow, condition assessment, validation, and error handling
// ABOUTME: Ensures proper equipment return process with condition tracking and next steps guidance

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EquipmentUnassignDialog } from "@/components/equipment/equipment-unassign-dialog";
import { toast } from "sonner";
import type { Equipment, User } from "@prisma/client";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
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
  status: "assigned",
  purchaseDate: new Date(),
  purchasePrice: 1200,
  currentValue: 800,
  location: "Office A",
  description: "Test laptop for unassignment",
  createdAt: new Date(),
  updatedAt: new Date(),
  currentOwner: {
    id: "user1",
    name: "John Doe",
    email: "john@example.com",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

const mockEquipmentWithoutOwner: Equipment & { currentOwner: User | null } = {
  ...mockEquipment,
  currentOwner: null,
};

describe("EquipmentUnassignDialog", () => {
  const mockOnOpenChange = jest.fn();
  const mockRouterRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockOnOpenChange.mockClear();
    mockRouterRefresh.mockClear();
  });

  it("returns null when equipment has no current owner", () => {
    const { container } = render(
      <EquipmentUnassignDialog
        equipment={mockEquipmentWithoutOwner}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders dialog with equipment and owner information", () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText("Unassign Equipment")).toBeInTheDocument();
    expect(
      screen.getByText(/Unassign "Test Laptop" \(LPT-001\) from John Doe/)
    ).toBeInTheDocument();
    expect(screen.getByText("Current Assignment")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("Equipment Condition *")).toBeInTheDocument();
    expect(screen.getByText("Return Notes")).toBeInTheDocument();
  });

  it("shows validation error when no condition is selected", async () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const unassignButton = screen.getByText("Unassign Equipment");
    await userEvent.click(unassignButton);

    expect(toast.error).toHaveBeenCalledWith("Please select the equipment condition");
  });

  it("disables unassign button when no condition is selected", () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const unassignButton = screen.getByText("Unassign Equipment");
    expect(unassignButton).toBeDisabled();
  });

  it("enables unassign button when condition is selected", async () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    const excellentOption = screen.getByText("Excellent - Like new condition");
    await userEvent.click(excellentOption);

    const unassignButton = screen.getByText("Unassign Equipment");
    expect(unassignButton).toBeEnabled();
  });

  it("shows appropriate next steps for excellent condition", async () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    const excellentOption = screen.getByText("Excellent - Like new condition");
    await userEvent.click(excellentOption);

    await waitFor(() => {
      expect(screen.getByText("Next Steps")).toBeInTheDocument();
      expect(
        screen.getByText("Equipment will be marked as available for reassignment.")
      ).toBeInTheDocument();
    });
  });

  it("shows appropriate next steps for good condition", async () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    const goodOption = screen.getByText("Good - Minor wear, fully functional");
    await userEvent.click(goodOption);

    await waitFor(() => {
      expect(screen.getByText("Next Steps")).toBeInTheDocument();
      expect(
        screen.getByText("Equipment will be marked as available for reassignment.")
      ).toBeInTheDocument();
    });
  });

  it("shows appropriate next steps for fair condition", async () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    const fairOption = screen.getByText("Fair - Some wear, functional");
    await userEvent.click(fairOption);

    await waitFor(() => {
      expect(screen.getByText("Next Steps")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Equipment will be marked as available but may need minor maintenance."
        )
      ).toBeInTheDocument();
    });
  });

  it("shows appropriate next steps for poor condition", async () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    const poorOption = screen.getByText("Poor - Significant wear, may need maintenance");
    await userEvent.click(poorOption);

    await waitFor(() => {
      expect(screen.getByText("Next Steps")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Equipment will require maintenance before being available again."
        )
      ).toBeInTheDocument();
    });
  });

  it("shows appropriate next steps for broken condition", async () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    const brokenOption = screen.getByText("Broken - Not functional, needs repair");
    await userEvent.click(brokenOption);

    await waitFor(() => {
      expect(screen.getByText("Next Steps")).toBeInTheDocument();
      expect(
        screen.getByText("Equipment will be marked as broken and require repair.")
      ).toBeInTheDocument();
    });

    const unassignButton = screen.getByText("Unassign Equipment");
    expect(unassignButton).toHaveClass("bg-destructive");
  });

  it("successfully unassigns equipment with notes", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Select condition
    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    const goodOption = screen.getByText("Good - Minor wear, fully functional");
    await userEvent.click(goodOption);

    // Add notes
    const notesTextarea = screen.getByPlaceholderText(
      "Add any notes about the return or equipment condition..."
    );
    await userEvent.type(notesTextarea, "Returned in good condition");

    // Submit form
    const unassignButton = screen.getByText("Unassign Equipment");
    await userEvent.click(unassignButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/equipment/1/unassign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          condition: "good",
          notes: "Returned in good condition",
        }),
      });
    });

    expect(toast.success).toHaveBeenCalledWith("Equipment unassigned successfully");
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("successfully unassigns equipment without notes", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Select condition
    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    const excellentOption = screen.getByText("Excellent - Like new condition");
    await userEvent.click(excellentOption);

    // Submit form without notes
    const unassignButton = screen.getByText("Unassign Equipment");
    await userEvent.click(unassignButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/equipment/1/unassign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          condition: "excellent",
          notes: undefined,
        }),
      });
    });
  });

  it("handles unassignment error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: "Unassignment failed" }),
    });

    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Select condition
    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    const fairOption = screen.getByText("Fair - Some wear, functional");
    await userEvent.click(fairOption);

    // Submit form
    const unassignButton = screen.getByText("Unassign Equipment");
    await userEvent.click(unassignButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Unassignment failed");
    });
  });

  it("shows loading state during unassignment", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => {
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({}),
      }), 100);
    }));

    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Select condition
    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    const goodOption = screen.getByText("Good - Minor wear, fully functional");
    await userEvent.click(goodOption);

    // Submit form
    const unassignButton = screen.getByText("Unassign Equipment");
    await userEvent.click(unassignButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText("Processing...")).toBeInTheDocument();
      expect(unassignButton).toBeDisabled();
    });

    // Wait for completion
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Equipment unassigned successfully");
    }, 150);
  });

  it("disables buttons during loading", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => {
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({}),
      }), 100);
    }));

    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Select condition
    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    const goodOption = screen.getByText("Good - Minor wear, fully functional");
    await userEvent.click(goodOption);

    // Submit form
    const unassignButton = screen.getByText("Unassign Equipment");
    await userEvent.click(unassignButton);

    // Check loading state
    await waitFor(() => {
      const cancelButton = screen.getByText("Cancel");
      expect(cancelButton).toBeDisabled();
      expect(unassignButton).toBeDisabled();
    });
  });

  it("closes dialog on cancel", async () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const cancelButton = screen.getByText("Cancel");
    await userEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("has proper accessibility attributes", () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    
    const title = screen.getByText("Unassign Equipment");
    expect(title).toBeInTheDocument();
    
    const conditionLabel = screen.getByText("Equipment Condition *");
    expect(conditionLabel).toBeInTheDocument();
    
    const notesLabel = screen.getByText("Return Notes");
    expect(notesLabel).toBeInTheDocument();
  });

  it("shows all condition options", async () => {
    render(
      <EquipmentUnassignDialog
        equipment={mockEquipment}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const selectTrigger = screen.getByText("Assess the equipment condition...");
    await userEvent.click(selectTrigger);

    expect(screen.getByText("Excellent - Like new condition")).toBeInTheDocument();
    expect(screen.getByText("Good - Minor wear, fully functional")).toBeInTheDocument();
    expect(screen.getByText("Fair - Some wear, functional")).toBeInTheDocument();
    expect(screen.getByText("Poor - Significant wear, may need maintenance")).toBeInTheDocument();
    expect(screen.getByText("Broken - Not functional, needs repair")).toBeInTheDocument();
  });
});