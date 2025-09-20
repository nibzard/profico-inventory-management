// ABOUTME: Unit tests for useAuth hook
// ABOUTME: Tests authentication state management and role checking functionality

import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import { useSession } from "next-auth/react";

// Mock next-auth/react
jest.mock("next-auth/react");

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe("useAuth", () => {
  const mockSession = {
    data: {
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        role: "user" as const,
      },
    },
    status: "authenticated" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return loading state when session is loading", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
    expect(result.current.session).toBeUndefined();
  });

  it("should return authenticated state with user data", () => {
    mockUseSession.mockReturnValue(mockSession);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockSession.data.user);
    expect(result.current.session).toEqual(mockSession.data);
  });

  it("should return unauthenticated state when no session", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
    expect(result.current.session).toBeUndefined();
  });

  describe("checkRole", () => {
    it("should return false when user is not authenticated", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.checkRole("admin")).toBe(false);
    });

    it("should return true when user has the required role", () => {
      const adminSession = {
        data: {
          user: {
            id: "1",
            name: "Admin User",
            email: "admin@example.com",
            role: "admin" as const,
          },
        },
        status: "authenticated" as const,
      };

      mockUseSession.mockReturnValue(adminSession);

      const { result } = renderHook(() => useAuth());

      expect(result.current.checkRole("admin")).toBe(true);
    });

    it("should return false when user does not have the required role", () => {
      const userSession = {
        data: {
          user: {
            id: "2",
            name: "Regular User",
            email: "user@example.com",
            role: "user" as const,
          },
        },
        status: "authenticated" as const,
      };

      mockUseSession.mockReturnValue(userSession);

      const { result } = renderHook(() => useAuth());

      expect(result.current.checkRole("admin")).toBe(false);
    });

    it("should return false when user has no role", () => {
      const sessionWithoutRole = {
        data: {
          user: {
            id: "3",
            name: "User Without Role",
            email: "norole@example.com",
            role: undefined,
          },
        },
        status: "authenticated" as const,
      };

      mockUseSession.mockReturnValue(sessionWithoutRole);

      const { result } = renderHook(() => useAuth());

      expect(result.current.checkRole("admin")).toBe(false);
    });
  });

  describe("permissions", () => {
    describe("admin user permissions", () => {
      const adminSession = {
        data: {
          user: {
            id: "1",
            name: "Admin User",
            email: "admin@example.com",
            role: "admin" as const,
          },
        },
        status: "authenticated" as const,
      };

      beforeEach(() => {
        mockUseSession.mockReturnValue(adminSession);
      });

      it("should have all admin permissions", () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current.permissions.canAccessAdmin).toBe(true);
        expect(result.current.permissions.canApproveRequests).toBe(true);
        expect(result.current.permissions.canManageEquipment).toBe(true);
        expect(result.current.permissions.canViewAllEquipment).toBe(true);
        expect(result.current.permissions.canManageUsers).toBe(true);
        expect(result.current.permissions.canAccessReports).toBe(true);
      });
    });

    describe("team lead user permissions", () => {
      const teamLeadSession = {
        data: {
          user: {
            id: "2",
            name: "Team Lead User",
            email: "teamlead@example.com",
            role: "team_lead" as const,
          },
        },
        status: "authenticated" as const,
      };

      beforeEach(() => {
        mockUseSession.mockReturnValue(teamLeadSession);
      });

      it("should have team lead permissions", () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current.permissions.canAccessAdmin).toBe(false);
        expect(result.current.permissions.canApproveRequests).toBe(true);
        expect(result.current.permissions.canManageEquipment).toBe(true);
        expect(result.current.permissions.canViewAllEquipment).toBe(true);
        expect(result.current.permissions.canManageUsers).toBe(false);
        expect(result.current.permissions.canAccessReports).toBe(true);
      });
    });

    describe("regular user permissions", () => {
      const userSession = {
        data: {
          user: {
            id: "3",
            name: "Regular User",
            email: "user@example.com",
            role: "user" as const,
          },
        },
        status: "authenticated" as const,
      };

      beforeEach(() => {
        mockUseSession.mockReturnValue(userSession);
      });

      it("should have basic user permissions", () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current.permissions.canAccessAdmin).toBe(false);
        expect(result.current.permissions.canApproveRequests).toBe(false);
        expect(result.current.permissions.canManageEquipment).toBe(false);
        expect(result.current.permissions.canViewAllEquipment).toBe(false);
        expect(result.current.permissions.canManageUsers).toBe(false);
        expect(result.current.permissions.canAccessReports).toBe(false);
      });
    });

    describe("unauthenticated user permissions", () => {
      beforeEach(() => {
        mockUseSession.mockReturnValue({
          data: null,
          status: "unauthenticated",
        });
      });

      it("should have no permissions", () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current.permissions.canAccessAdmin).toBe(false);
        expect(result.current.permissions.canApproveRequests).toBe(false);
        expect(result.current.permissions.canManageEquipment).toBe(false);
        expect(result.current.permissions.canViewAllEquipment).toBe(false);
        expect(result.current.permissions.canManageUsers).toBe(false);
        expect(result.current.permissions.canAccessReports).toBe(false);
      });
    });
  });

  it("should return consistent object structure", () => {
    mockUseSession.mockReturnValue(mockSession);

    const { result } = renderHook(() => useAuth());

    expect(result.current).toHaveProperty("session");
    expect(result.current).toHaveProperty("user");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("isAuthenticated");
    expect(result.current).toHaveProperty("checkRole");
    expect(result.current).toHaveProperty("permissions");

    expect(typeof result.current.checkRole).toBe("function");
    expect(typeof result.current.permissions).toBe("object");
    expect(typeof result.current.isLoading).toBe("boolean");
    expect(typeof result.current.isAuthenticated).toBe("boolean");
  });

  it("should handle session updates", () => {
    // Start with unauthenticated state
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    const { result, rerender } = renderHook(() => useAuth());

    // Initial state - unauthenticated
    expect(result.current.isAuthenticated).toBe(false);

    // Update session to authenticated
    mockUseSession.mockReturnValue(mockSession);
    rerender();

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockSession.data.user);
  });

  it("should handle session with null user", () => {
    const sessionWithNullUser = {
      data: {
        user: null,
      },
      status: "authenticated" as const,
    };

    mockUseSession.mockReturnValue(sessionWithNullUser);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.checkRole("admin")).toBe(false);
  });
});