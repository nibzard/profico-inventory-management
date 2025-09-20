// ABOUTME: Unit tests for RoleGuard component - role-based access control
// ABOUTME: Tests rendering behavior based on user roles and authentication state

import { render, screen } from "@testing-library/react";
import { RoleGuard, AdminOnly, ManagersOnly, AuthenticatedOnly } from "@/components/auth/role-guard";
import { useAuth } from "@/hooks/use-auth";

// Mock the useAuth hook
jest.mock("@/hooks/use-auth");

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("RoleGuard", () => {
  const mockChildren = <div>Protected Content</div>;
  const mockFallback = <div>Access Denied</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("when loading", () => {
    it("should show fallback when session is loading", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        checkRole: jest.fn(),
        permissions: {} as any,
        session: null,
      });

      render(
        <RoleGuard allowedRoles={["admin"]} fallback={mockFallback}>
          {mockChildren}
        </RoleGuard>
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });

  describe("when unauthenticated", () => {
    it("should show fallback when user is not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        checkRole: jest.fn(),
        permissions: {} as any,
        session: null,
      });

      render(
        <RoleGuard allowedRoles={["admin"]} fallback={mockFallback}>
          {mockChildren}
        </RoleGuard>
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });

  describe("when authenticated", () => {
    const mockAdminUser = {
      id: "1",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin" as const,
    };

    const mockTeamLeadUser = {
      id: "2",
      name: "Team Lead User",
      email: "teamlead@example.com",
      role: "team_lead" as const,
    };

    const mockRegularUser = {
      id: "3",
      name: "Regular User",
      email: "user@example.com",
      role: "user" as const,
    };

    it("should render content when user has required role", () => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        isLoading: false,
        isAuthenticated: true,
        checkRole: jest.fn().mockReturnValue(true),
        permissions: {} as any,
        session: { user: mockAdminUser } as any,
      });

      render(
        <RoleGuard requiredRole="admin" fallback={mockFallback}>
          {mockChildren}
        </RoleGuard>
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
      expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
    });

    it("should show fallback when user doesn't have required role", () => {
      mockUseAuth.mockReturnValue({
        user: mockRegularUser,
        isLoading: false,
        isAuthenticated: true,
        checkRole: jest.fn().mockReturnValue(false),
        permissions: {} as any,
        session: { user: mockRegularUser } as any,
      });

      render(
        <RoleGuard requiredRole="admin" fallback={mockFallback}>
          {mockChildren}
        </RoleGuard>
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("should render content when user's role is in allowed roles", () => {
      mockUseAuth.mockReturnValue({
        user: mockTeamLeadUser,
        isLoading: false,
        isAuthenticated: true,
        checkRole: jest.fn().mockReturnValue(true),
        permissions: {} as any,
        session: { user: mockTeamLeadUser } as any,
      });

      render(
        <RoleGuard allowedRoles={["admin", "team_lead"]} fallback={mockFallback}>
          {mockChildren}
        </RoleGuard>
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
      expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
    });

    it("should show fallback when user's role is not in allowed roles", () => {
      mockUseAuth.mockReturnValue({
        user: mockRegularUser,
        isLoading: false,
        isAuthenticated: true,
        checkRole: jest.fn().mockReturnValue(false),
        permissions: {} as any,
        session: { user: mockRegularUser } as any,
      });

      render(
        <RoleGuard allowedRoles={["admin", "team_lead"]} fallback={mockFallback}>
          {mockChildren}
        </RoleGuard>
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("should render null when no fallback is provided", () => {
      mockUseAuth.mockReturnValue({
        user: mockRegularUser,
        isLoading: false,
        isAuthenticated: true,
        checkRole: jest.fn().mockReturnValue(false),
        permissions: {} as any,
        session: { user: mockRegularUser } as any,
      });

      const { container } = render(
        <RoleGuard allowedRoles={["admin"]}>
          {mockChildren}
        </RoleGuard>
      );

      expect(container).toBeEmptyDOMElement();
    });
  });
});

describe("AdminOnly", () => {
  it("should render content for admin users", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
    mockUseAuth.mockReturnValue({
      user: { role: "admin" as const, id: "1", name: "Admin", email: "admin@test.com" },
      isLoading: false,
      isAuthenticated: true,
      checkRole: jest.fn().mockReturnValue(true),
      permissions: {} as any,
      session: { user: { role: "admin" as const } } as any,
    });

    render(
      <AdminOnly fallback={<div>Not Admin</div>}>
        <div>Admin Content</div>
      </AdminOnly>
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("should show fallback for non-admin users", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
    mockUseAuth.mockReturnValue({
      user: { role: "user" as const, id: "2", name: "User", email: "user@test.com" },
      isLoading: false,
      isAuthenticated: true,
      checkRole: jest.fn().mockReturnValue(false),
      permissions: {} as any,
      session: { user: { role: "user" as const } } as any,
    });

    render(
      <AdminOnly fallback={<div>Not Admin</div>}>
        <div>Admin Content</div>
      </AdminOnly>
    );

    expect(screen.getByText("Not Admin")).toBeInTheDocument();
  });
});

describe("ManagersOnly", () => {
  it("should render content for admin users", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
    mockUseAuth.mockReturnValue({
      user: { role: "admin" as const, id: "1", name: "Admin", email: "admin@test.com" },
      isLoading: false,
      isAuthenticated: true,
      checkRole: jest.fn().mockReturnValue(true),
      permissions: {} as any,
      session: { user: { role: "admin" as const } } as any,
    });

    render(
      <ManagersOnly fallback={<div>Not Manager</div>}>
        <div>Manager Content</div>
      </ManagersOnly>
    );

    expect(screen.getByText("Manager Content")).toBeInTheDocument();
  });

  it("should render content for team lead users", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
    mockUseAuth.mockReturnValue({
      user: { role: "team_lead" as const, id: "2", name: "Team Lead", email: "lead@test.com" },
      isLoading: false,
      isAuthenticated: true,
      checkRole: jest.fn().mockReturnValue(true),
      permissions: {} as any,
      session: { user: { role: "team_lead" as const } } as any,
    });

    render(
      <ManagersOnly fallback={<div>Not Manager</div>}>
        <div>Manager Content</div>
      </ManagersOnly>
    );

    expect(screen.getByText("Manager Content")).toBeInTheDocument();
  });

  it("should show fallback for regular users", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
    mockUseAuth.mockReturnValue({
      user: { role: "user" as const, id: "3", name: "User", email: "user@test.com" },
      isLoading: false,
      isAuthenticated: true,
      checkRole: jest.fn().mockReturnValue(false),
      permissions: {} as any,
      session: { user: { role: "user" as const } } as any,
    });

    render(
      <ManagersOnly fallback={<div>Not Manager</div>}>
        <div>Manager Content</div>
      </ManagersOnly>
    );

    expect(screen.getByText("Not Manager")).toBeInTheDocument();
  });
});

describe("AuthenticatedOnly", () => {
  it("should render content for any authenticated user", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
    mockUseAuth.mockReturnValue({
      user: { role: "user" as const, id: "1", name: "User", email: "user@test.com" },
      isLoading: false,
      isAuthenticated: true,
      checkRole: jest.fn().mockReturnValue(true),
      permissions: {} as any,
      session: { user: { role: "user" as const } } as any,
    });

    render(
      <AuthenticatedOnly fallback={<div>Not Authenticated</div>}>
        <div>Authenticated Content</div>
      </AuthenticatedOnly>
    );

    expect(screen.getByText("Authenticated Content")).toBeInTheDocument();
  });

  it("should show fallback for unauthenticated users", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      checkRole: jest.fn(),
      permissions: {} as any,
      session: null,
    });

    render(
      <AuthenticatedOnly fallback={<div>Not Authenticated</div>}>
        <div>Authenticated Content</div>
      </AuthenticatedOnly>
    );

    expect(screen.getByText("Not Authenticated")).toBeInTheDocument();
  });
});