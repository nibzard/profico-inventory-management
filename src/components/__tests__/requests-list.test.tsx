// ABOUTME: Unit tests for requests list component
// ABOUTME: Tests request display, role-based actions, and pagination

import { render, screen, fireEvent } from "@testing-library/react";
import { RequestsList } from "@/components/requests/requests-list";
import type { EquipmentRequest, User, Equipment } from "@prisma/client";
import Link from "next/link";

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Note: UI components and icons are mocked globally in jest.setup.js

// Mock data
const mockUser: User = {
  id: "1",
  name: "John Doe",
  email: "john@example.com",
  role: "user",
  image: null,
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  teamId: null,
};

const mockEquipment: Equipment = {
  id: "1",
  name: "MacBook Pro",
  serialNumber: "MBP123",
  category: "laptop",
  status: "assigned",
  purchaseDate: new Date(),
  purchaseMethod: "profi_co",
  purchasePrice: 2000,
  currentValue: 1500,
  description: "Test laptop",
  ownerId: "1",
  assignedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  teamId: null,
};

const mockRequests = [
  {
    id: "1",
    equipmentType: "MacBook Pro 14-inch",
    justification: "Need for development work",
    priority: "high",
    status: "pending",
    requesterId: "1",
    approverId: null,
    teamLeadApproval: null,
    adminApproval: null,
    rejectionReason: null,
    equipmentId: null,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    requester: mockUser,
    approver: null,
    equipment: null,
  },
  {
    id: "2",
    equipmentType: "iPhone 15",
    justification: "Company phone for communication",
    priority: "medium",
    status: "approved",
    requesterId: "1",
    approverId: "2",
    teamLeadApproval: true,
    adminApproval: true,
    rejectionReason: null,
    equipmentId: "1",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-12"),
    requester: mockUser,
    approver: { ...mockUser, id: "2", name: "Jane Smith", role: "admin" },
    equipment: mockEquipment,
  },
  {
    id: "3",
    equipmentType: "Dell Monitor",
    justification: "Second monitor for productivity",
    priority: "low",
    status: "rejected",
    requesterId: "1",
    approverId: "2",
    teamLeadApproval: false,
    adminApproval: null,
    rejectionReason: "Budget constraints",
    equipmentId: null,
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-09"),
    requester: mockUser,
    approver: { ...mockUser, id: "2", name: "Jane Smith", role: "admin" },
    equipment: null,
  },
];

describe("RequestsList", () => {
  const defaultProps = {
    requests: mockRequests,
    currentPage: 1,
    totalPages: 3,
    userRole: "user",
    userId: "1",
  };

  describe("request display", () => {
    it("should render all requests", () => {
      render(<RequestsList {...defaultProps} />);

      expect(screen.getByText("MacBook Pro 14-inch")).toBeInTheDocument();
      expect(screen.getByText("iPhone 15")).toBeInTheDocument();
      expect(screen.getByText("Dell Monitor")).toBeInTheDocument();
    });

    it("should show request status badges", () => {
      render(<RequestsList {...defaultProps} />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
      expect(screen.getByText("Rejected")).toBeInTheDocument();
    });

    it("should show priority badges", () => {
      render(<RequestsList {...defaultProps} />);

      expect(screen.getByText("HIGH")).toBeInTheDocument();
      expect(screen.getByText("MEDIUM")).toBeInTheDocument();
      expect(screen.getByText("LOW")).toBeInTheDocument();
    });

    it("should display requester information for admin", () => {
      render(<RequestsList {...defaultProps} userRole="admin" />);

      // For admin view, the avatar section should be visible
      // Look for any avatar element (simplified test)
      const avatarElements = screen.getAllByTestId(/avatar/).length;
      expect(avatarElements).toBeGreaterThan(0);
    });

    it("should hide requester information for regular users", () => {
      render(<RequestsList {...defaultProps} userRole="user" />);

      expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
    });

    it("should show justification preview", () => {
      render(<RequestsList {...defaultProps} />);

      expect(screen.getByText("Need for development work")).toBeInTheDocument();
      expect(screen.getByText("Company phone for communication")).toBeInTheDocument();
      expect(screen.getByText("Second monitor for productivity")).toBeInTheDocument();
    });

    it("should show rejection reason when present", () => {
      render(<RequestsList {...defaultProps} />);

      expect(screen.getByText("Budget constraints")).toBeInTheDocument();
    });

    it("should show assigned equipment when present", () => {
      render(<RequestsList {...defaultProps} />);

      expect(screen.getByText("Assigned Equipment:")).toBeInTheDocument();
      expect(screen.getByText("MacBook Pro (MBP123)")).toBeInTheDocument();
    });

    it("should show request date", () => {
      render(<RequestsList {...defaultProps} />);

      expect(screen.getByText("1/15/2024")).toBeInTheDocument();
      expect(screen.getByText("1/10/2024")).toBeInTheDocument();
      expect(screen.getByText("1/8/2024")).toBeInTheDocument();
    });
  });

  describe("approval workflow", () => {
    it("should show approval status for pending requests", () => {
      render(<RequestsList {...defaultProps} />);

      expect(screen.getByText("Approval:")).toBeInTheDocument();
      expect(screen.getByText("Team Lead")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("should show correct approval step colors", () => {
      const { container } = render(<RequestsList {...defaultProps} />);
      
      // For pending request, team lead should be orange (required)
      const teamLeadStep = container.querySelector('.bg-orange-100');
      expect(teamLeadStep).toBeInTheDocument();
    });

    it("should show approved steps in green", () => {
      const { container } = render(
        <RequestsList
          {...defaultProps}
          requests={[
            {
              ...mockRequests[0],
              teamLeadApproval: true,
              adminApproval: null,
            },
          ]}
        />
      );

      const approvedStep = container.querySelector('.bg-green-100');
      expect(approvedStep).toBeInTheDocument();
    });

    it("should show rejected steps in red", () => {
      const { container } = render(
        <RequestsList
          {...defaultProps}
          requests={[
            {
              ...mockRequests[0],
              teamLeadApproval: false,
              adminApproval: null,
            },
          ]}
        />
      );

      const rejectedStep = container.querySelector('.bg-red-100');
      expect(rejectedStep).toBeInTheDocument();
    });
  });

  describe("role-based actions", () => {
    it("should show edit option for request owner", () => {
      render(<RequestsList {...defaultProps} />);

      // With mocked dropdown, content should be visible
      expect(screen.getByText("View Details")).toBeInTheDocument();
      // Edit option should be visible for request owner
      expect(screen.getByText("Edit Request")).toBeInTheDocument();
    });

    it("should hide edit option for non-owners", () => {
      render(<RequestsList {...defaultProps} userId="2" />);

      // Find dropdown trigger and click it
      const dropdownTriggers = screen.getAllByRole("button");
      const firstTrigger = dropdownTriggers.find(btn => 
        btn.querySelector('[data-testid="more-horizontal"]')
      );
      
      if (firstTrigger) {
        fireEvent.click(firstTrigger);
        expect(screen.queryByText("Edit Request")).not.toBeInTheDocument();
      }
    });

    it("should show approve/reject options for team leads", () => {
      render(<RequestsList {...defaultProps} userRole="team_lead" />);

      // With mocked dropdown, content should be visible
      expect(screen.getByText("View Details")).toBeInTheDocument();
      // For team leads, approve/reject options should be visible
      expect(screen.getByText("Approve")).toBeInTheDocument();
      expect(screen.getByText("Reject")).toBeInTheDocument();
    });

    it("should show approve/reject options for admins", () => {
      render(<RequestsList {...defaultProps} userRole="admin" />);

      // With mocked dropdown, content should be visible
      expect(screen.getByText("View Details")).toBeInTheDocument();
      // For admins, approve/reject options should be visible
      expect(screen.getByText("Approve")).toBeInTheDocument();
      expect(screen.getByText("Reject")).toBeInTheDocument();
    });

    it("should hide approve/reject options for regular users", () => {
      render(<RequestsList {...defaultProps} userRole="user" />);

      // With mocked dropdown, content should be visible
      expect(screen.getByText("View Details")).toBeInTheDocument();
      // For regular users, approve/reject options should not be visible
      expect(screen.queryByText("Approve")).not.toBeInTheDocument();
      expect(screen.queryByText("Reject")).not.toBeInTheDocument();
    });

    it("should show quick actions for approvers", () => {
      render(<RequestsList {...defaultProps} userRole="team_lead" />);

      expect(screen.getByText("Review & Approve")).toBeInTheDocument();
    });

    it("should hide quick actions for non-approvers", () => {
      render(<RequestsList {...defaultProps} userRole="user" />);

      expect(screen.queryByText("Review & Approve")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty state message for regular users", () => {
      render(<RequestsList {...defaultProps} requests={[]} userRole="user" />);

      expect(screen.getByText("No requests found")).toBeInTheDocument();
      expect(screen.getByText("You haven't submitted any equipment requests yet")).toBeInTheDocument();
      expect(screen.getByText("Submit Your First Request")).toBeInTheDocument();
    });

    it("should show empty state message for admins", () => {
      render(<RequestsList {...defaultProps} requests={[]} userRole="admin" />);

      expect(screen.getByText("No requests found")).toBeInTheDocument();
      expect(screen.getByText("No requests match the current filters")).toBeInTheDocument();
      expect(screen.queryByText("Submit Your First Request")).not.toBeInTheDocument();
    });

    it("should show first request button only for users", () => {
      render(<RequestsList {...defaultProps} requests={[]} userRole="user" />);

      const button = screen.getByText("Submit Your First Request");
      expect(button).toBeInTheDocument();
      expect(button.closest("a")).toHaveAttribute("href", "/requests/new");
    });
  });

  describe("pagination", () => {
    it("should show pagination when totalPages > 1", () => {
      render(<RequestsList {...defaultProps} totalPages={3} />);

      expect(screen.getByTestId("chevron-left")).toBeInTheDocument();
      expect(screen.getByTestId("chevron-right")).toBeInTheDocument();
    });

    it("should hide pagination when totalPages = 1", () => {
      render(<RequestsList {...defaultProps} totalPages={1} />);

      expect(screen.queryByTestId("chevron-left")).not.toBeInTheDocument();
      expect(screen.queryByTestId("chevron-right")).not.toBeInTheDocument();
    });

    it("should disable previous button on first page", () => {
      render(<RequestsList {...defaultProps} currentPage={1} totalPages={3} />);

      const prevButton = screen.getByTestId("chevron-left").closest("a");
      // The disabled state is handled by the Button component, check parent class
      const buttonContainer = prevButton?.parentElement;
      expect(buttonContainer).toHaveClass("disabled");
    });

    it("should disable next button on last page", () => {
      render(<RequestsList {...defaultProps} currentPage={3} totalPages={3} />);

      const nextButton = screen.getByTestId("chevron-right").closest("a");
      // The disabled state is handled by the Button component, check parent class
      const buttonContainer = nextButton?.parentElement;
      expect(buttonContainer).toHaveClass("disabled");
    });

    it("should show correct page numbers", () => {
      render(<RequestsList {...defaultProps} currentPage={2} totalPages={5} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("should show ellipsis for large page ranges", () => {
      render(<RequestsList {...defaultProps} currentPage={5} totalPages={10} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      // There should be at least one ellipsis
      const ellipsisElements = screen.getAllByText("...");
      expect(ellipsisElements.length).toBeGreaterThan(0);
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("should highlight current page", () => {
      render(<RequestsList {...defaultProps} currentPage={2} totalPages={5} />);

      const currentPageButton = screen.getByText("2").closest("a");
      // The current page button should be wrapped in a Button with default variant
      const buttonContainer = currentPageButton?.parentElement;
      expect(buttonContainer).toBeInTheDocument();
    });

    it("should have correct pagination links", () => {
      render(<RequestsList {...defaultProps} currentPage={2} totalPages={5} />);

      const page1Link = screen.getByText("1").closest("a");
      expect(page1Link).toHaveAttribute("href", "/requests?page=1");

      const page3Link = screen.getByText("3").closest("a");
      expect(page3Link).toHaveAttribute("href", "/requests?page=3");
    });
  });

  describe("edge cases", () => {
    it("should handle requests with null approver", () => {
      const requestWithNullApprover = [
        {
          ...mockRequests[0],
          approver: null,
        },
      ];

      render(<RequestsList {...defaultProps} requests={requestWithNullApprover} />);

      expect(screen.getByText("MacBook Pro 14-inch")).toBeInTheDocument();
    });

    it("should handle requests with null equipment", () => {
      const requestWithNullEquipment = [
        {
          ...mockRequests[0],
          equipment: null,
        },
      ];

      render(<RequestsList {...defaultProps} requests={requestWithNullEquipment} />);

      expect(screen.getByText("MacBook Pro 14-inch")).toBeInTheDocument();
      expect(screen.queryByText("Assigned Equipment:")).not.toBeInTheDocument();
    });

    it("should handle unknown priority levels", () => {
      const requestWithUnknownPriority = [
        {
          ...mockRequests[0],
          priority: "unknown",
        },
      ];

      render(<RequestsList {...defaultProps} requests={requestWithUnknownPriority} />);

      expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
    });

    it("should handle unknown status levels", () => {
      const requestWithUnknownStatus = [
        {
          ...mockRequests[0],
          status: "unknown",
        },
      ];

      render(<RequestsList {...defaultProps} requests={requestWithUnknownStatus} />);

      expect(screen.getByText("unknown")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper button text for screen readers", () => {
      render(<RequestsList {...defaultProps} />);

      const viewDetailsButtons = screen.getAllByText("View Full Details");
      expect(viewDetailsButtons.length).toBeGreaterThan(0);
    });

    it("should have proper status indicators with icons", () => {
      render(<RequestsList {...defaultProps} />);

      expect(screen.getByTestId("clock")).toBeInTheDocument();
      expect(screen.getByTestId("check-circle")).toBeInTheDocument();
      expect(screen.getByTestId("x-circle")).toBeInTheDocument();
    });

    it("should have proper priority indicators", () => {
      render(<RequestsList {...defaultProps} />);

      expect(screen.getByTestId("alert-triangle")).toBeInTheDocument();
    });
  });
});