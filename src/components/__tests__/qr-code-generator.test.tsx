// ABOUTME: Unit tests for QRCodeGenerator component
// ABOUTME: Tests QR code generation, dialog rendering, and basic functionality

import { render, screen, fireEvent } from "@testing-library/react";
import QRCodeGenerator from "@/components/qr-code-generator";
import userEvent from "@testing-library/user-event";

// Mock the qrcode.react library
jest.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, size, level, includeMargin }: any) => (
    <svg
      data-testid="qr-code"
      data-value={value}
      data-size={size}
      data-level={level}
      data-include-margin={includeMargin}
      width={size}
      height={size}
    >
      <rect width="100%" height="100%" fill="white" />
      <rect width="50%" height="50%" fill="black" />
    </svg>
  ),
}));

describe("QRCodeGenerator", () => {
  const mockValue = "https://example.com/test";
  const mockTitle = "Test QR Code";
  const mockDescription = "This is a test QR code";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render with default trigger button", () => {
    render(<QRCodeGenerator value={mockValue} />);

    const triggerButton = screen.getByRole("button", { name: /generate qr code/i });
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton).toHaveTextContent("Generate QR Code");
  });

  it("should render with custom trigger", () => {
    const customTrigger = <button data-testid="custom-trigger">Custom Trigger</button>;
    render(<QRCodeGenerator value={mockValue} trigger={customTrigger} />);

    expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate qr code/i })).not.toBeInTheDocument();
  });

  it("should open dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<QRCodeGenerator value={mockValue} title={mockTitle} />);

    const triggerButton = screen.getByRole("button", { name: /generate qr code/i });
    await user.click(triggerButton);

    expect(screen.getByText(mockTitle)).toBeInTheDocument();
    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
  });

  it("should display custom title and description", async () => {
    const user = userEvent.setup();
    render(
      <QRCodeGenerator
        value={mockValue}
        title={mockTitle}
        description={mockDescription}
      />
    );

    const triggerButton = screen.getByRole("button", { name: /generate qr code/i });
    await user.click(triggerButton);

    expect(screen.getByText(mockTitle)).toBeInTheDocument();
    expect(screen.getByText(mockDescription)).toBeInTheDocument();
  });

  it("should display QR code with correct props", async () => {
    const user = userEvent.setup();
    const customSize = 300;
    render(<QRCodeGenerator value={mockValue} size={customSize} />);

    const triggerButton = screen.getByRole("button", { name: /generate qr code/i });
    await user.click(triggerButton);

    const qrCode = screen.getByTestId("qr-code");
    expect(qrCode).toHaveAttribute("data-value", mockValue);
    expect(qrCode).toHaveAttribute("data-size", customSize.toString());
    expect(qrCode).toHaveAttribute("data-level", "H");
    expect(qrCode).toHaveAttribute("data-include-margin", "true");
  });

  it("should display QR code value in dialog", async () => {
    const user = userEvent.setup();
    render(<QRCodeGenerator value={mockValue} />);

    const triggerButton = screen.getByRole("button", { name: /generate qr code/i });
    await user.click(triggerButton);

    expect(screen.getByText(mockValue)).toBeInTheDocument();
    const valueContainer = screen.getByText(mockValue).closest("div");
    expect(valueContainer).toHaveClass("text-xs", "text-muted-foreground", "bg-muted", "p-2", "rounded");
  });

  it("should render download and copy buttons", async () => {
    const user = userEvent.setup();
    render(<QRCodeGenerator value={mockValue} />);

    const triggerButton = screen.getByRole("button", { name: /generate qr code/i });
    await user.click(triggerButton);

    const downloadButton = screen.getByRole("button", { name: /download/i });
    const copyButton = screen.getByRole("button", { name: /copy/i });

    expect(downloadButton).toBeInTheDocument();
    expect(copyButton).toBeInTheDocument();
  });

  it("should apply correct styling to dialog content", async () => {
    const user = userEvent.setup();
    render(<QRCodeGenerator value={mockValue} title={mockTitle} />);

    const triggerButton = screen.getByRole("button", { name: /generate qr code/i });
    await user.click(triggerButton);

    const dialogContent = screen.getByText(mockTitle).closest("div");
    expect(dialogContent?.parentElement).toHaveClass("max-w-md");

    const qrWrapper = screen.getByTestId("qr-code").parentElement;
    expect(qrWrapper).toHaveClass("p-4", "bg-white", "rounded-lg", "border");

    const qrContainer = qrWrapper?.parentElement;
    expect(qrContainer).toHaveClass("flex", "justify-center");
  });

  it("should render with default size when not specified", async () => {
    const user = userEvent.setup();
    render(<QRCodeGenerator value={mockValue} />);

    const triggerButton = screen.getByRole("button", { name: /generate qr code/i });
    await user.click(triggerButton);

    const qrCode = screen.getByTestId("qr-code");
    expect(qrCode).toHaveAttribute("data-size", "200");
  });

  it("should use default title when not specified", async () => {
    const user = userEvent.setup();
    render(<QRCodeGenerator value={mockValue} />);

    const triggerButton = screen.getByRole("button", { name: /generate qr code/i });
    await user.click(triggerButton);

    expect(screen.getByText("QR Code")).toBeInTheDocument();
  });

  it("should handle long QR code values", async () => {
    const user = userEvent.setup();
    const longValue = "https://example.com/very/long/url/that/needs/to/be/broken/across/multiple/lines/for/readability";
    render(<QRCodeGenerator value={longValue} />);

    const triggerButton = screen.getByRole("button", { name: /generate qr code/i });
    await user.click(triggerButton);

    expect(screen.getByText(longValue)).toBeInTheDocument();
    const valueContainer = screen.getByText(longValue);
    expect(valueContainer).toHaveClass("break-all");
  });

  it("should be accessible with proper ARIA attributes", async () => {
    const user = userEvent.setup();
    render(<QRCodeGenerator value={mockValue} title={mockTitle} />);

    const triggerButton = screen.getByRole("button", { name: /generate qr code/i });
    expect(triggerButton).toHaveAttribute("type", "button");

    await user.click(triggerButton);

    // The title should be present in the dialog
    expect(screen.getByText(mockTitle)).toBeInTheDocument();
  });
});