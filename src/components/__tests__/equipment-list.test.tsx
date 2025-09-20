// ABOUTME: Unit tests for EquipmentList component - equipment listing with role-based actions
// ABOUTME: Tests rendering, pagination, role-based actions, and empty states

import { render, screen, fireEvent } from "@testing-library/react";
import { EquipmentList } from "@/components/equipment/equipment-list";
import { EquipmentAssignDialog } from "@/components/equipment/equipment-assign-dialog";
import { EquipmentUnassignDialog } from "@/components/equipment/equipment-unassign-dialog";
import type { Equipment, User } from "@prisma/client";

// Mock the child components
jest.mock("@/components/equipment/equipment-assign-dialog");
jest.mock("@/components/equipment/equipment-unassign-dialog");

const MockEquipmentAssignDialog = EquipmentAssignDialog as jest.MockedFunction<typeof EquipmentAssignDialog>;
const MockEquipmentUnassignDialog = EquipmentUnassignDialog as jest.MockedFunction<typeof EquipmentUnassignDialog>;

// Mock the Link component from Next.js
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, disabled }: { children: React.ReactNode; href: string; disabled?: boolean }) => (
    <a href={disabled ? undefined : href} disabled={disabled} data-testid="mock-link">
      {children}
    </a>
  ),
}));

interface EquipmentWithOwner extends Equipment {
  currentOwner: User | null;
}

describe("EquipmentList", () => {
  const mockEquipment: EquipmentWithOwner[] = [
    {
      id: "1",
      name: "MacBook Pro",
      brand: "Apple",
      model: "MacBook Pro 16\"",
      serialNumber: "C02Z51ABMD6T",
      category: "laptop",
      status: "available",
      purchaseDate: new Date("2023-01-15"),
      purchasePrice: 2499.99,
      purchaseMethod: "profi_co",
      currentValue: 1999.99,
      location: "Office A",
      description: "Primary work laptop",
      notes: null,
      qrCodeId: "QR001",
      teamId: null,
      currentOwnerId: null,
      currentOwner: null,
      createdAt: new Date("2023-01-15"),
      updatedAt: new Date("2023-01-15"),
    },
    {
      id: "2",
      name: "Dell Monitor",
      brand: "Dell",
      model: "U2720Q",
      serialNumber: "DEL001",
      category: "monitor",
      status: "assigned",
      purchaseDate: new Date("2023-02-01"),
      purchasePrice: 499.99,
      purchaseMethod: "profi_co",
      currentValue: 399.99,
      location: "Office B",
      description: "4K USB-C monitor",
      notes: null,
      qrCodeId: "QR002",
      teamId: null,
      currentOwnerId: "user1",
      currentOwner: {
        id: "user1",
        name: "John Doe",
        email: "john@example.com",
        image: "https://example.com/avatar.jpg",
        role: "user",
      },
      createdAt: new Date("2023-02-01"),
      updatedAt: new Date("2023-02-01"),
    },
    {
      id: "3",
      name: "Broken Laptop",
      brand: "HP",
      model: "EliteBook",
      serialNumber: "HP002",
      category: "laptop",
      status: "broken",
      purchaseDate: new Date("2022-06-15"),
      purchasePrice: 1299.99,
      purchaseMethod: "zopi",
      currentValue: 0,
      location: "Repair Shop",
      description: "Needs screen replacement",
      notes: "Sent for repair on 2023-09-01",
      qrCodeId: "QR003",
      teamId: null,
      currentOwnerId: null,
      currentOwner: null,
      createdAt: new Date("2022-06-15"),
      updatedAt: new Date("2023-09-01"),
    },
  ];

  const defaultProps = {
    equipment: mockEquipment,
    currentPage: 1,
    totalPages: 3,
    userRole: "admin",
    userId: "admin1",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockEquipmentAssignDialog.mockImplementation(({ equipment, open, onOpenChange }) => (
      <div data-testid="assign-dialog">
        <div>Equipment: {equipment?.name}</div>
        <div>Open: {open ? 'true' : 'false'}</div>
        <button onClick={() => onOpenChange?.(false)}>Close</button>
      </div>
    ));
    MockEquipmentUnassignDialog.mockImplementation(({ equipment, open, onOpenChange }) => (
      <div data-testid="unassign-dialog">
        <div>Equipment: {equipment?.name}</div>
        <div>Open: {open ? 'true' : 'false'}</div>
        <button onClick={() => onOpenChange?.(false)}>Close</button>
      </div>
    ));
  });

  describe("rendering", () => {
    it("should render equipment cards correctly", () => {
      render(<EquipmentList {...defaultProps} />);

      expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
      expect(screen.getByText("Apple MacBook Pro 16\"")).toBeInTheDocument();
      expect(screen.getByText("Dell Monitor")).toBeInTheDocument();
      expect(screen.getByText("Dell U2720Q")).toBeInTheDocument();
      expect(screen.getByText("Broken Laptop")).toBeInTheDocument();
      expect(screen.getByText("HP EliteBook")).toBeInTheDocument();
    });

    it("should display status badges correctly", () => {
      render(<EquipmentList {...defaultProps} />);

      expect(screen.getByText("AVAILABLE")).toBeInTheDocument();
      expect(screen.getByText("ASSIGNED")).toBeInTheDocument();
      expect(screen.getByText("BROKEN")).toBeInTheDocument();
    });

    it("should display owner information when assigned", () => {
      render(<EquipmentList {...defaultProps} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      // Look for unassigned in the specific context of assigned to field
      const unassignedElements = screen.getAllByText("Unassigned");
      expect(unassignedElements.length).toBeGreaterThan(0);
    });

    it("should display purchase date correctly", () => {
      render(<EquipmentList {...defaultProps} />);

      expect(screen.getByText("1/15/2023")).toBeInTheDocument();
      expect(screen.getByText("2/1/2023")).toBeInTheDocument();
    });

    it("should display location when available", () => {
      render(<EquipmentList {...defaultProps} />);

      expect(screen.getByText("Office A")).toBeInTheDocument();
      expect(screen.getByText("Office B")).toBeInTheDocument();
      expect(screen.getByText("Repair Shop")).toBeInTheDocument();
    });

    it("should show empty state when no equipment", () => {
      render(<EquipmentList {...defaultProps} equipment={[]} />);

      expect(screen.getByText("No equipment found")).toBeInTheDocument();
      expect(screen.getByText("Try adjusting your search or filter criteria")).toBeInTheDocument();
    });
  });

  describe("role-based actions", () => {
    describe("as admin", () => {
      it("should show all actions for available equipment", () => {
        render(<EquipmentList {...defaultProps} userRole="admin" />);

        // View Details should always be visible
        expect(screen.getAllByText("View Details")).toHaveLength(3);

        // Edit should be visible for admin
        expect(screen.getAllByText("Edit")).toHaveLength(3);

        // Assign should be visible for available equipment
        expect(screen.getByText("Assign User")).toBeInTheDocument();

        // Unassign should be visible for assigned equipment
        expect(screen.getByText("Unassign")).toBeInTheDocument();

        // Maintenance should be visible for admin
        expect(screen.getAllByText("Maintenance")).toHaveLength(3);

        // QR Code should always be visible
        expect(screen.getAllByText("QR Code")).toHaveLength(3);
      });
    });

    describe("as team lead", () => {
      it("should show edit and maintenance actions", () => {
        render(<EquipmentList {...defaultProps} userRole="team_lead" />);

        expect(screen.getAllByText("Edit")).toHaveLength(3);
        expect(screen.getAllByText("Maintenance")).toHaveLength(3);
        expect(screen.getByText("Assign User")).toBeInTheDocument();
        expect(screen.getByText("Unassign")).toBeInTheDocument();
      });
    });

    describe("as regular user", () => {
      it("should only show view and QR code actions", () => {
        render(<EquipmentList {...defaultProps} userRole="user" />);

        expect(screen.getAllByText("View Details")).toHaveLength(3);
        expect(screen.getAllByText("QR Code")).toHaveLength(3);

        // Should not show restricted actions
        expect(screen.queryByText("Edit")).not.toBeInTheDocument();
        expect(screen.queryByText("Assign User")).not.toBeInTheDocument();
        expect(screen.queryByText("Unassign")).not.toBeInTheDocument();
        expect(screen.queryByText("Maintenance")).not.toBeInTheDocument();
      });
    });
  });

  describe("dialog interactions", () => {
    it("should open assign dialog when assign is clicked", () => {
      render(<EquipmentList {...defaultProps} />);

      const assignButton = screen.getByText("Assign User");
      fireEvent.click(assignButton);

      expect(MockEquipmentAssignDialog).toHaveBeenCalled();
      const callArgs = MockEquipmentAssignDialog.mock.calls[0][0];
      expect(callArgs.equipment).toEqual(mockEquipment[0]);
      expect(callArgs.open).toBe(true);
      expect(callArgs.onOpenChange).toBeDefined();
    });

    it("should open unassign dialog when unassign is clicked", () => {
      render(<EquipmentList {...defaultProps} />);

      const unassignButton = screen.getByText("Unassign");
      fireEvent.click(unassignButton);

      expect(MockEquipmentUnassignDialog).toHaveBeenCalled();
      const callArgs = MockEquipmentUnassignDialog.mock.calls[0][0];
      expect(callArgs.equipment).toEqual(mockEquipment[1]);
      expect(callArgs.open).toBe(true);
      expect(callArgs.onOpenChange).toBeDefined();
    });
  });

  describe("pagination", () => {
    it("should not show pagination when there's only one page", () => {
      render(<EquipmentList {...defaultProps} totalPages={1} />);

      expect(screen.queryByLabelText("Previous page")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Next page")).not.toBeInTheDocument();
    });

    it("should show pagination when there are multiple pages", () => {
      render(<EquipmentList {...defaultProps} totalPages={5} currentPage={3} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("should disable previous button on first page", () => {
      render(<EquipmentList {...defaultProps} totalPages={5} currentPage={1} />);

      // Find the chevron left icon and check if the link is disabled
      const chevronLeftIcon = screen.getByTestId("chevronleft-icon");
      const prevLink = chevronLeftIcon.closest("a");
      expect(prevLink).toHaveAttribute("disabled");
    });

    it("should disable next button on last page", () => {
      render(<EquipmentList {...defaultProps} totalPages={5} currentPage={5} />);

      // Find the chevron right icon and check if the link is disabled
      const chevronRightIcon = screen.getByTestId("chevronright-icon");
      const nextLink = chevronRightIcon.closest("a");
      expect(nextLink).toHaveAttribute("disabled");
    });

    it("should show ellipsis for large page ranges", () => {
      render(<EquipmentList {...defaultProps} totalPages={10} currentPage={5} />);

      expect(screen.getAllByText("...")).toHaveLength(2);
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });
  });

  describe("status badge variants", () => {
    it("should apply correct variant for each status", () => {
      render(<EquipmentList {...defaultProps} />);

      // Available status should have default variant
      const availableBadge = screen.getByText("AVAILABLE");
      expect(availableBadge).toHaveClass("bg-primary");

      // Assigned status should have secondary variant
      const assignedBadge = screen.getByText("ASSIGNED");
      expect(assignedBadge).toHaveClass("bg-secondary");

      // Broken status should have destructive variant
      const brokenBadge = screen.getByText("BROKEN");
      expect(brokenBadge).toHaveClass("bg-destructive");
    });

    it("should handle unknown status with outline variant", () => {
      const equipmentWithUnknownStatus = [
        {
          ...mockEquipment[0],
          status: "unknown" as any,
        },
      ];

      render(<EquipmentList {...defaultProps} equipment={equipmentWithUnknownStatus} />);

      const unknownBadge = screen.getByText("UNKNOWN");
      expect(unknownBadge).toHaveClass("border-input");
    });
  });

  describe("accessibility", () => {
    it("should have proper alt text for avatars", () => {
      render(<EquipmentList {...defaultProps} />);

      // Avatar should have proper fallback
      const avatarFallback = screen.getByText("JD"); // John Doe -> JD
      expect(avatarFallback).toBeInTheDocument();
    });

    it("should have proper button labels for dropdown actions", () => {
      render(<EquipmentList {...defaultProps} />);

      // More actions button should be accessible
      const moreButtons = screen.getAllByRole("button").filter(
        (button) => button.querySelector('[data-testid="morehorizontal-icon"]')
      );
      expect(moreButtons).toHaveLength(3);
    });
  });

  describe("responsive design", () => {
    it("should render correctly on different screen sizes", () => {
      render(<EquipmentList {...defaultProps} />);

      // Should have responsive grid classes
      const grid = document.querySelector('.grid');
      expect(grid).toHaveClass("grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3");
    });
  });
});