// ABOUTME: Unit tests for Header component - main application header
// ABOUTME: Tests rendering of header content, branding, and PWA integration

import { render, screen } from "@testing-library/react";
import { Header } from "@/components/layout/header";

// Mock the PWAInstallPrompt component
jest.mock("@/components/pwa-install-prompt", () => ({
  __esModule: true,
  default: () => <div data-testid="pwa-install-prompt">PWA Install Prompt</div>,
}));

describe("Header", () => {
  it("should render main header with branding", () => {
    render(<Header />);

    // Check header container
    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass("bg-white", "border-b", "border-gray-200", "px-6", "py-4");

    // Check main branding
    const title = screen.getByText("ProfiCo Inventory");
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("text-xl", "font-semibold", "text-gray-900");
  });

  it("should render with proper layout structure", () => {
    render(<Header />);

    // Check main container div
    const container = screen.getByRole("banner").querySelector("div");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("flex", "items-center", "justify-between");

    // Check left section (branding)
    const leftSection = container?.querySelector("div:first-child");
    expect(leftSection).toBeInTheDocument();
    expect(leftSection).toHaveClass("flex", "items-center", "space-x-4");

    // Check right section (user area)
    const rightSection = container?.querySelector("div:last-child");
    expect(rightSection).toBeInTheDocument();
    expect(rightSection).toHaveClass("flex", "items-center", "space-x-4");
  });

  it("should include PWA install prompt", () => {
    render(<Header />);

    const pwaPrompt = screen.getByTestId("pwa-install-prompt");
    expect(pwaPrompt).toBeInTheDocument();
    expect(pwaPrompt).toHaveTextContent("PWA Install Prompt");
  });

  it("should display welcome message", () => {
    render(<Header />);

    const welcomeMessage = screen.getByText("Welcome back!");
    expect(welcomeMessage).toBeInTheDocument();
    expect(welcomeMessage).toHaveClass("text-sm", "text-gray-600");
  });

  it("should have proper accessibility attributes", () => {
    render(<Header />);

    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();

    // Check that header has proper semantic structure
    const heading = header.querySelector("h1");
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("ProfiCo Inventory");
  });

  it("should maintain consistent spacing and styling", () => {
    render(<Header />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("border-b", "border-gray-200");

    const title = screen.getByText("ProfiCo Inventory");
    expect(title).toHaveClass("font-semibold");

    const welcomeMessage = screen.getByText("Welcome back!");
    expect(welcomeMessage).toHaveClass("text-sm");
  });

  it("should render all expected elements in correct order", () => {
    render(<Header />);

    const header = screen.getByRole("banner");
    const container = header.querySelector("div");
    const leftSection = container?.querySelector("div:first-child");
    const rightSection = container?.querySelector("div:last-child");

    // Left section should contain title
    const title = leftSection?.querySelector("h1");
    expect(title).toBeInTheDocument();

    // Right section should contain PWA prompt and welcome message
    const pwaPrompt = rightSection?.querySelector('[data-testid="pwa-install-prompt"]');
    const welcomeMessage = rightSection?.querySelector('span:not([data-testid])');

    expect(pwaPrompt).toBeInTheDocument();
    expect(welcomeMessage).toBeInTheDocument();
    expect(welcomeMessage).toHaveTextContent("Welcome back!");
  });

  it("should have responsive design classes", () => {
    render(<Header />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("px-6"); // Horizontal padding
    expect(header).toHaveClass("py-4"); // Vertical padding

    const container = header.querySelector("div");
    expect(container).toHaveClass("flex"); // Flexbox layout
  });
});