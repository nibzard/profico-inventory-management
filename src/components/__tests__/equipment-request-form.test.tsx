// ABOUTME: Unit tests for EquipmentRequestForm component - equipment request form with validation
// ABOUTME: Tests form validation, submission, error handling, and user interactions

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EquipmentRequestForm } from "@/components/requests/equipment-request-form";
import { toast } from "sonner";

// Mock the necessary modules
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;
const mockRouter = require("next/navigation").useRouter();
const mockToast = toast as jest.Mocked<typeof toast>;

describe("EquipmentRequestForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockRouter.push.mockClear();
    mockRouter.back.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
  });

  describe("form rendering", () => {
    it("should render all form fields correctly", () => {
      render(<EquipmentRequestForm />);

      expect(screen.getByLabelText("Equipment Type *")).toBeInTheDocument();
      expect(screen.getByLabelText("Category *")).toBeInTheDocument();
      expect(screen.getByLabelText("Priority Level")).toBeInTheDocument();
      expect(screen.getByLabelText("Business Justification *")).toBeInTheDocument();
      expect(screen.getByLabelText("Specific Requirements (Optional)")).toBeInTheDocument();

      expect(screen.getByText("Submit Request")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should render equipment categories in select dropdown", () => {
      render(<EquipmentRequestForm />);

      fireEvent.click(screen.getByText("Select equipment category"));

      expect(screen.getByText("Computers & Laptops")).toBeInTheDocument();
      expect(screen.getByText("Mobile Devices & Tablets")).toBeInTheDocument();
      expect(screen.getByText("Peripherals (Mouse, Keyboard, etc.)")).toBeInTheDocument();
      expect(screen.getByText("Other")).toBeInTheDocument();
    });

    it("should render priority levels with descriptions", () => {
      render(<EquipmentRequestForm />);

      fireEvent.click(screen.getByDisplayValue("Medium - Important"));

      expect(screen.getByText("Low - Nice to have")).toBeInTheDocument();
      expect(screen.getByText("Can wait several weeks")).toBeInTheDocument();
      expect(screen.getByText("High - Critical")).toBeInTheDocument();
      expect(screen.getByText("Needed within a few days")).toBeInTheDocument();
      expect(screen.getByText("Urgent - Blocking work")).toBeInTheDocument();
      expect(screen.getByText("Needed immediately")).toBeInTheDocument();
    });

    it("should show helpful hints and guidelines", () => {
      render(<EquipmentRequestForm />);

      expect(screen.getByText("Be specific about the type and model if known")).toBeInTheDocument();
      expect(screen.getByText("Minimum 20 characters. The more detail you provide, the faster the approval process.")).toBeInTheDocument();
      expect(screen.getByText("Before Submitting")).toBeInTheDocument();
      expect(screen.getByText("Check if similar equipment is already available in the system")).toBeInTheDocument();
    });

    it("should have default priority set to medium", () => {
      render(<EquipmentRequestForm />);

      const prioritySelect = screen.getByLabelText("Priority Level");
      expect(prioritySelect).toHaveDisplayValue("Medium - Important");
    });
  });

  describe("form validation", () => {
    it("should show error for empty equipment type", async () => {
      render(<EquipmentRequestForm />);

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Please specify the equipment type");
      });
    });

    it("should show error for unselected category", async () => {
      render(<EquipmentRequestForm />);

      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: "MacBook Pro" },
      });

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Please select a category");
      });
    });

    it("should show error for insufficient justification length", async () => {
      render(<EquipmentRequestForm />);

      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: "MacBook Pro" },
      });

      fireEvent.click(screen.getByText("Select equipment category"));
      fireEvent.click(screen.getByText("Computers & Laptops"));

      fireEvent.change(screen.getByLabelText("Business Justification *"), {
        target: { value: "Too short" },
      });

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Please provide a detailed justification (at least 20 characters)"
        );
      });
    });

    it("should accept valid justification length", async () => {
      render(<EquipmentRequestForm />);

      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: "MacBook Pro" },
      });

      fireEvent.click(screen.getByText("Select equipment category"));
      fireEvent.click(screen.getByText("Computers & Laptops"));

      fireEvent.change(screen.getByLabelText("Business Justification *"), {
        target: { value: "This is a valid justification that meets the minimum 20 character requirement." },
      });

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).not.toHaveBeenCalledWith(
          "Please provide a detailed justification (at least 20 characters)"
        );
      });
    });

    it("should validate all required fields are filled", async () => {
      render(<EquipmentRequestForm />);

      // Fill only some required fields
      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: "MacBook Pro" },
      });

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should still show category error
        expect(mockToast.error).toHaveBeenCalledWith("Please select a category");
      });
    });
  });

  describe("form submission", () => {
    const validFormData = {
      equipmentType: "MacBook Pro 14-inch",
      category: "computers",
      justification: "I need this laptop for my daily development work as it will improve my productivity significantly.",
      priority: "high",
      specificRequirements: "16GB RAM, 512GB SSD, M2 Pro chip",
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "req123" }),
      } as Response);
    });

    it("should submit form with valid data", async () => {
      render(<EquipmentRequestForm />);

      // Fill all required fields
      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: validFormData.equipmentType },
      });

      fireEvent.click(screen.getByText("Select equipment category"));
      fireEvent.click(screen.getByText("Computers & Laptops"));

      fireEvent.change(screen.getByLabelText("Business Justification *"), {
        target: { value: validFormData.justification },
      });

      fireEvent.click(screen.getByDisplayValue("Medium - Important"));
      fireEvent.click(screen.getByText("High - Critical"));

      fireEvent.change(screen.getByLabelText("Specific Requirements (Optional)"), {
        target: { value: validFormData.specificRequirements },
      });

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            equipmentType: validFormData.equipmentType,
            category: validFormData.category,
            justification: validFormData.justification,
            priority: validFormData.priority,
            specificRequirements: validFormData.specificRequirements,
          }),
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith("Equipment request submitted successfully!");
      expect(mockRouter.push).toHaveBeenCalledWith("/requests/req123");
    });

    it("should trim whitespace from form fields", async () => {
      render(<EquipmentRequestForm />);

      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: "  MacBook Pro  " },
      });

      fireEvent.click(screen.getByText("Select equipment category"));
      fireEvent.click(screen.getByText("Computers & Laptops"));

      fireEvent.change(screen.getByLabelText("Business Justification *"), {
        target: { value: "  Justification with spaces  " },
      });

      fireEvent.change(screen.getByLabelText("Specific Requirements (Optional)"), {
        target: { value: "  Requirements with spaces  " },
      });

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            equipmentType: "MacBook Pro", // Trimmed
            category: "computers",
            justification: "Justification with spaces", // Trimmed
            priority: "medium",
            specificRequirements: "Requirements with spaces", // Trimmed
          }),
        });
      });
    });

    it("should handle optional specific requirements field", async () => {
      render(<EquipmentRequestForm />);

      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: validFormData.equipmentType },
      });

      fireEvent.click(screen.getByText("Select equipment category"));
      fireEvent.click(screen.getByText("Computers & Laptops"));

      fireEvent.change(screen.getByLabelText("Business Justification *"), {
        target: { value: validFormData.justification },
      });

      // Leave specific requirements empty
      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            equipmentType: validFormData.equipmentType,
            category: "computers",
            justification: validFormData.justification,
            priority: "medium",
            specificRequirements: undefined, // Should be undefined when empty
          }),
        });
      });
    });
  });

  describe("error handling", () => {
    it("should handle API errors", async () => {
      const errorMessage = "Server error occurred";
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: errorMessage }),
      } as Response);

      render(<EquipmentRequestForm />);

      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: "MacBook Pro" },
      });

      fireEvent.click(screen.getByText("Select equipment category"));
      fireEvent.click(screen.getByText("Computers & Laptops"));

      fireEvent.change(screen.getByLabelText("Business Justification *"), {
        target: { value: "Valid justification that meets the minimum length requirement." },
      });

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<EquipmentRequestForm />);

      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: "MacBook Pro" },
      });

      fireEvent.click(screen.getByText("Select equipment category"));
      fireEvent.click(screen.getByText("Computers & Laptops"));

      fireEvent.change(screen.getByLabelText("Business Justification *"), {
        target: { value: "Valid justification that meets the minimum length requirement." },
      });

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to submit request");
      });
    });

    it("should handle API error without message", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      } as Response);

      render(<EquipmentRequestForm />);

      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: "MacBook Pro" },
      });

      fireEvent.click(screen.getByText("Select equipment category"));
      fireEvent.click(screen.getByText("Computers & Laptops"));

      fireEvent.change(screen.getByLabelText("Business Justification *"), {
        target: { value: "Valid justification that meets the minimum length requirement." },
      });

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to submit request");
      });
    });
  });

  describe("loading states", () => {
    it("should show loading state during submission", async () => {
      // Mock delayed response
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ id: "req123" }) }), 100))
      );

      render(<EquipmentRequestForm />);

      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: "MacBook Pro" },
      });

      fireEvent.click(screen.getByText("Select equipment category"));
      fireEvent.click(screen.getByText("Computers & Laptops"));

      fireEvent.change(screen.getByLabelText("Business Justification *"), {
        target: { value: "Valid justification that meets the minimum length requirement." },
      });

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      expect(screen.getByText("Submitting...")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText("Submit Request")).toBeInTheDocument();
      }, 200);
    });

    it("should disable submit button while loading", async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ id: "req123" }) }), 100))
      );

      render(<EquipmentRequestForm />);

      fireEvent.change(screen.getByLabelText("Equipment Type *"), {
        target: { value: "MacBook Pro" },
      });

      fireEvent.click(screen.getByText("Select equipment category"));
      fireEvent.click(screen.getByText("Computers & Laptops"));

      fireEvent.change(screen.getByLabelText("Business Justification *"), {
        target: { value: "Valid justification that meets the minimum length requirement." },
      });

      const submitButton = screen.getByText("Submit Request");
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, 200);
    });
  });

  describe("form interactions", () => {
    it("should navigate back when cancel is clicked", () => {
      render(<EquipmentRequestForm />);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it("should maintain form state during typing", () => {
      render(<EquipmentRequestForm />);

      const equipmentTypeInput = screen.getByLabelText("Equipment Type *");
      fireEvent.change(equipmentTypeInput, {
        target: { value: "MacBook Pro" },
      });

      expect(equipmentTypeInput).toHaveValue("MacBook Pro");

      const justificationTextarea = screen.getByLabelText("Business Justification *");
      fireEvent.change(justificationTextarea, {
        target: { value: "This is my justification" },
      });

      expect(justificationTextarea).toHaveValue("This is my justification");
    });

    it("should handle priority selection correctly", () => {
      render(<EquipmentRequestForm />);

      const prioritySelect = screen.getByLabelText("Priority Level");
      expect(prioritySelect).toHaveDisplayValue("Medium - Important");

      fireEvent.click(prioritySelect);
      fireEvent.click(screen.getByText("High - Critical"));

      expect(prioritySelect).toHaveDisplayValue("High - Critical");
    });
  });

  describe("accessibility", () => {
    it("should have proper form labels", () => {
      render(<EquipmentRequestForm />);

      const equipmentTypeLabel = screen.getByLabelText("Equipment Type *");
      const categoryLabel = screen.getByLabelText("Category *");
      const justificationLabel = screen.getByLabelText("Business Justification *");

      expect(equipmentTypeLabel).toBeInTheDocument();
      expect(categoryLabel).toBeInTheDocument();
      expect(justificationLabel).toBeInTheDocument();

      expect(equipmentTypeLabel).toHaveAttribute("for", "equipmentType");
      expect(categoryLabel).toHaveAttribute("for", "category");
      expect(justificationLabel).toHaveAttribute("for", "justification");
    });

    it("should have proper form field attributes", () => {
      render(<EquipmentRequestForm />);

      const equipmentTypeInput = screen.getByLabelText("Equipment Type *");
      expect(equipmentTypeInput).toHaveAttribute("required");
      expect(equipmentTypeInput).toHaveAttribute("id", "equipmentType");

      const justificationTextarea = screen.getByLabelText("Business Justification *");
      expect(justificationTextarea).toHaveAttribute("required");
      expect(justificationTextarea).toHaveAttribute("rows", "4");
    });

    it("should have helpful placeholder text", () => {
      render(<EquipmentRequestForm />);

      const equipmentTypeInput = screen.getByLabelText("Equipment Type *");
      expect(equipmentTypeInput).toHaveAttribute(
        "placeholder",
        "e.g., MacBook Pro 14-inch, iPhone 15, Dell Monitor"
      );

      const justificationTextarea = screen.getByLabelText("Business Justification *");
      expect(justificationTextarea).toHaveAttribute(
        "placeholder",
        "Explain why you need this equipment, how it will be used, and how it relates to your work responsibilities..."
      );
    });
  });
});