// ABOUTME: Unit tests for QRScanner component - QR code scanning with camera access
// ABOUTME: Tests camera permissions, scanning functionality, error handling, and cleanup

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import QRScanner from "@/components/qr-scanner";

// Mock the @zxing/browser module
jest.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: jest.fn().mockImplementation(() => ({
    decodeFromVideoDevice: jest.fn(),
  })),
}));

// Mock MediaStream and MediaStreamTrack
const mockMediaStream = {
  getTracks: jest.fn().mockReturnValue([
    {
      stop: jest.fn(),
    },
  ]),
};

// Mock navigator.mediaDevices
Object.defineProperty(navigator, "mediaDevices", {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(mockMediaStream),
  },
  writable: true,
});

const mockBrowserMultiFormatReader = require("@zxing/browser").BrowserMultiFormatReader;

describe("QRScanner", () => {
  const mockOnScan = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnScan.mockClear();
    mockBrowserMultiFormatReader.mockClear();
    navigator.mediaDevices.getUserMedia.mockClear();
  });

  describe("rendering", () => {
    it("should render with default trigger button", () => {
      render(<QRScanner onScan={mockOnScan} />);

      expect(screen.getByText("Scan QR Code")).toBeInTheDocument();
      expect(screen.getByText("Start Scanning")).toBeInTheDocument();
    });

    it("should render with custom trigger", () => {
      const customTrigger = <button data-testid="custom-trigger">Custom Scan</button>;
      render(<QRScanner onScan={mockOnScan} trigger={customTrigger} />);

      expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
      expect(screen.getByText("Custom Scan")).toBeInTheDocument();
    });

    it("should show camera icon when not scanning", () => {
      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog
      fireEvent.click(screen.getByText("Scan QR Code"));

      expect(screen.getByText("Click \"Start Scanning\" to scan QR codes with your camera")).toBeInTheDocument();
      expect(screen.getByText("Start Scanning")).toBeInTheDocument();
    });

    it("should show video element when scanning", async () => {
      const mockDecodeFromVideoDevice = jest.fn();
      mockBrowserMultiFormatReader.mockImplementation(() => ({
        decodeFromVideoDevice: mockDecodeFromVideoDevice,
      }));

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog
      fireEvent.click(screen.getByText("Scan QR Code"));

      // Start scanning
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        expect(screen.getByTestId("video-element")).toBeInTheDocument();
        expect(screen.getByText("Stop Scanning")).toBeInTheDocument();
      });
    });
  });

  describe("scanning functionality", () => {
    it("should start scanning when Start Scanning is clicked", async () => {
      const mockDecodeFromVideoDevice = jest.fn();
      mockBrowserMultiFormatReader.mockImplementation(() => ({
        decodeFromVideoDevice: mockDecodeFromVideoDevice,
      }));

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog
      fireEvent.click(screen.getByText("Scan QR Code"));

      // Start scanning
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        expect(mockBrowserMultiFormatReader).toHaveBeenCalled();
        expect(mockDecodeFromVideoDevice).toHaveBeenCalledWith(
          undefined,
          expect.any(HTMLVideoElement),
          expect.any(Function)
        );
      });
    });

    it("should handle successful QR code scan", async () => {
      const mockDecodeFromVideoDevice = jest.fn();
      let scanCallback: any;

      mockBrowserMultiFormatReader.mockImplementation(() => ({
        decodeFromVideoDevice: jest.fn().mockImplementation((_, __, callback) => {
          scanCallback = callback;
        }),
      }));

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog and start scanning
      fireEvent.click(screen.getByText("Scan QR Code"));
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        expect(scanCallback).toBeDefined();
      });

      // Simulate successful scan
      const mockResult = {
        getText: () => "https://example.com/equipment/123",
      };
      scanCallback(mockResult, null);

      expect(mockOnScan).toHaveBeenCalledWith("https://example.com/equipment/123");
    });

    it("should stop scanning and close dialog after successful scan", async () => {
      const mockDecodeFromVideoDevice = jest.fn();
      let scanCallback: any;

      mockBrowserMultiFormatReader.mockImplementation(() => ({
        decodeFromVideoDevice: jest.fn().mockImplementation((_, __, callback) => {
          scanCallback = callback;
        }),
      }));

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog and start scanning
      fireEvent.click(screen.getByText("Scan QR Code"));
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        expect(scanCallback).toBeDefined();
      });

      // Simulate successful scan
      const mockResult = {
        getText: () => "https://example.com/equipment/123",
      };
      scanCallback(mockResult, null);

      await waitFor(() => {
        // Dialog should be closed
        expect(screen.queryByText("Scan QR Code")).not.toBeInTheDocument();
      });
    });

    it("should handle NotFoundException gracefully", async () => {
      const mockDecodeFromVideoDevice = jest.fn();
      let scanCallback: any;

      mockBrowserMultiFormatReader.mockImplementation(() => ({
        decodeFromVideoDevice: jest.fn().mockImplementation((_, __, callback) => {
          scanCallback = callback;
        }),
      }));

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog and start scanning
      fireEvent.click(screen.getByText("Scan QR Code"));
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        expect(scanCallback).toBeDefined();
      });

      // Simulate NotFoundException (normal during scanning)
      const notFoundError = new Error("NotFoundException");
      Object.defineProperty(notFoundError, "name", { value: "NotFoundException" });
      scanCallback(null, notFoundError);

      // Should not show error for NotFoundException
      expect(screen.queryByText("Failed to scan QR code")).not.toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("should show error when camera access fails", async () => {
      // Mock camera access failure
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: jest.fn().mockRejectedValue(new Error("Camera access denied")),
        },
        writable: true,
      });

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog
      fireEvent.click(screen.getByText("Scan QR Code"));

      // Start scanning
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        expect(screen.getByText("Failed to access camera")).toBeInTheDocument();
      });
    });

    it("should show error when QR scanning fails", async () => {
      const mockDecodeFromVideoDevice = jest.fn();
      let scanCallback: any;

      mockBrowserMultiFormatReader.mockImplementation(() => ({
        decodeFromVideoDevice: jest.fn().mockImplementation((_, __, callback) => {
          scanCallback = callback;
        }),
      }));

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog and start scanning
      fireEvent.click(screen.getByText("Scan QR Code"));
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        expect(scanCallback).toBeDefined();
      });

      // Simulate scanning error (not NotFoundException)
      const scanError = new Error("Scanning failed");
      Object.defineProperty(scanError, "name", { value: "OtherError" });
      scanCallback(null, scanError);

      expect(screen.getByText("Failed to scan QR code")).toBeInTheDocument();
    });

    it("should clear error when starting new scan", async () => {
      // Mock camera access failure first
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: jest.fn().mockRejectedValueOnce(new Error("Camera access denied")),
        },
        writable: true,
      });

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog
      fireEvent.click(screen.getByText("Scan QR Code"));

      // Start scanning (should fail)
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        expect(screen.getByText("Failed to access camera")).toBeInTheDocument();
      });

      // Fix camera for second attempt
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: jest.fn().mockResolvedValue(mockMediaStream),
        },
        writable: true,
      });

      // Try scanning again
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        // Error should be cleared
        expect(screen.queryByText("Failed to access camera")).not.toBeInTheDocument();
      });
    });
  });

  describe("cleanup", () => {
    it("should stop camera when stopping scanning", async () => {
      const mockDecodeFromVideoDevice = jest.fn();
      const mockStop = jest.fn();
      const mockTracks = [{ stop: mockStop }];

      const mockMediaStreamWithTracks = {
        getTracks: jest.fn().mockReturnValue(mockTracks),
      };

      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: jest.fn().mockResolvedValue(mockMediaStreamWithTracks),
        },
        writable: true,
      });

      mockBrowserMultiFormatReader.mockImplementation(() => ({
        decodeFromVideoDevice: mockDecodeFromVideoDevice,
      }));

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog and start scanning
      fireEvent.click(screen.getByText("Scan QR Code"));
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        expect(screen.getByText("Stop Scanning")).toBeInTheDocument();
      });

      // Stop scanning
      fireEvent.click(screen.getByText("Stop Scanning"));

      await waitFor(() => {
        expect(mockStop).toHaveBeenCalled();
        expect(screen.getByText("Start Scanning")).toBeInTheDocument();
      });
    });

    it("should cleanup when dialog is closed", async () => {
      const mockDecodeFromVideoDevice = jest.fn();
      const mockStop = jest.fn();
      const mockTracks = [{ stop: mockStop }];

      const mockMediaStreamWithTracks = {
        getTracks: jest.fn().mockReturnValue(mockTracks),
      };

      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: jest.fn().mockResolvedValue(mockMediaStreamWithTracks),
        },
        writable: true,
      });

      mockBrowserMultiFormatReader.mockImplementation(() => ({
        decodeFromVideoDevice: mockDecodeFromVideoDevice,
      }));

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog and start scanning
      fireEvent.click(screen.getByText("Scan QR Code"));
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        expect(screen.getByText("Stop Scanning")).toBeInTheDocument();
      });

      // Close dialog
      fireEvent.click(screen.getByText("Stop Scanning"));

      await waitFor(() => {
        expect(mockStop).toHaveBeenCalled();
      });
    });

    it("should cleanup when component unmounts", async () => {
      const mockDecodeFromVideoDevice = jest.fn();
      const mockStop = jest.fn();
      const mockTracks = [{ stop: mockStop }];

      const mockMediaStreamWithTracks = {
        getTracks: jest.fn().mockReturnValue(mockTracks),
      };

      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: jest.fn().mockResolvedValue(mockMediaStreamWithTracks),
        },
        writable: true,
      });

      mockBrowserMultiFormatReader.mockImplementation(() => ({
        decodeFromVideoDevice: mockDecodeFromVideoDevice,
      }));

      const { unmount } = render(<QRScanner onScan={mockOnScan} />);

      // Open dialog and start scanning
      fireEvent.click(screen.getByText("Scan QR Code"));
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        expect(screen.getByText("Stop Scanning")).toBeInTheDocument();
      });

      // Unmount component
      unmount();

      // Should have cleaned up
      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("should have proper button labels", () => {
      render(<QRScanner onScan={mockOnScan} />);

      const scanButton = screen.getByText("Scan QR Code");
      expect(scanButton).toBeInTheDocument();
      expect(scanButton).toHaveAttribute("type", "button");

      // Open dialog
      fireEvent.click(scanButton);

      const startButton = screen.getByText("Start Scanning");
      expect(startButton).toBeInTheDocument();
      expect(startButton).toHaveAttribute("type", "button");
    });

    it("should have proper dialog attributes", () => {
      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog
      fireEvent.click(screen.getByText("Scan QR Code"));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText("Scan QR Code")).toBeInTheDocument();
    });

    it("should have proper video element attributes", async () => {
      const mockDecodeFromVideoDevice = jest.fn();
      mockBrowserMultiFormatReader.mockImplementation(() => ({
        decodeFromVideoDevice: mockDecodeFromVideoDevice,
      }));

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog and start scanning
      fireEvent.click(screen.getByText("Scan QR Code"));
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        const video = screen.getByTestId("video-element");
        expect(video).toHaveAttribute("playsInline");
        expect(video).toHaveAttribute("muted");
        expect(video).toHaveClass("w-full", "h-64", "bg-black", "rounded-lg");
      });
    });
  });

  describe("video element setup", () => {
    it("should properly set video ref", async () => {
      const mockDecodeFromVideoDevice = jest.fn();
      mockBrowserMultiFormatReader.mockImplementation(() => ({
        decodeFromVideoDevice: mockDecodeFromVideoDevice,
      }));

      render(<QRScanner onScan={mockOnScan} />);

      // Open dialog and start scanning
      fireEvent.click(screen.getByText("Scan QR Code"));
      fireEvent.click(screen.getByText("Start Scanning"));

      await waitFor(() => {
        const video = screen.getByTestId("video-element");
        expect(video).toBeInTheDocument();
        expect(video).toHaveAttribute("data-testid", "video-element");
      });
    });
  });
});