// ABOUTME: Unit tests for SignOutButton component
// ABOUTME: Tests sign out functionality and button rendering

import { render, screen, fireEvent } from "@testing-library/react";
import { SignOutButton } from "@/components/sign-out-button";
import { signOut } from "next-auth/react";

// Mock next-auth/react
jest.mock("next-auth/react");

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

describe("SignOutButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render sign out button", () => {
    render(<SignOutButton />);

    const button = screen.getByRole("button", { name: /sign out/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Sign Out");
  });

  it("should have outline styling", () => {
    render(<SignOutButton />);

    const button = screen.getByRole("button", { name: /sign out/i });
    expect(button).toBeInTheDocument();
    // Check that it's not disabled and has basic button classes
    expect(button).not.toBeDisabled();
    expect(button).toHaveClass("inline-flex", "items-center", "justify-center");
  });

  it("should call signOut with callbackUrl when clicked", () => {
    render(<SignOutButton />);

    const button = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(button);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({
      callbackUrl: "/",
    });
  });

  it("should be accessible with proper role", () => {
    render(<SignOutButton />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should handle click events properly", () => {
    const handleClick = jest.fn();
    mockSignOut.mockImplementation(handleClick);

    render(<SignOutButton />);

    const button = screen.getByRole("button", { name: /sign out/i });
    
    // Test that the button is clickable
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should have consistent styling", () => {
    render(<SignOutButton />);

    const button = screen.getByRole("button", { name: /sign out/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("inline-flex", "items-center", "justify-center", "gap-2");
    expect(button).toHaveTextContent("Sign Out");
  });
});