import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileForm } from "../profile/profile-form";
import { toast } from "sonner";

// Mock the next/navigation
const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe("ProfileForm", () => {
  const mockUser = {
    id: "user1",
    name: "John Doe",
    email: "john@example.com",
    role: "user",
    image: "https://example.com/john.jpg",
    createdAt: new Date(),
    updatedAt: new Date(),
    teamId: null,
    team: null,
  };

  const defaultProps = {
    user: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render profile form with all fields", () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      expect(screen.getByLabelText("Profile Image URL")).toBeInTheDocument();
      expect(screen.getByText("Update Profile")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should initialize form with user data", () => {
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByLabelText("Full Name");
      const emailInput = screen.getByLabelText("Email Address");
      const imageInput = screen.getByLabelText("Profile Image URL");

      expect(nameInput).toHaveValue("John Doe");
      expect(emailInput).toHaveValue("john@example.com");
      expect(imageInput).toHaveValue("https://example.com/john.jpg");
    });

    it("should show help text for email field", () => {
      render(<ProfileForm {...defaultProps} />);

      expect(
        screen.getByText("Your email address is used for login and notifications")
      ).toBeInTheDocument();
    });

    it("should show help text for image field", () => {
      render(<ProfileForm {...defaultProps} />);

      expect(
        screen.getByText("Optional: Enter a URL for your profile picture")
      ).toBeInTheDocument();
    });

    it("should show placeholder text for image field", () => {
      render(<ProfileForm {...defaultProps} />);

      const imageInput = screen.getByLabelText("Profile Image URL");
      expect(imageInput).toHaveAttribute(
        "placeholder",
        "https://example.com/your-photo.jpg"
      );
    });
  });

  describe("form interactions", () => {
    it("should update form data when name is changed", () => {
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByLabelText("Full Name");
      fireEvent.change(nameInput, { target: { value: "Jane Smith" } });

      expect(nameInput).toHaveValue("Jane Smith");
    });

    it("should update form data when email is changed", () => {
      render(<ProfileForm {...defaultProps} />);

      const emailInput = screen.getByLabelText("Email Address");
      fireEvent.change(emailInput, { target: { value: "jane@example.com" } });

      expect(emailInput).toHaveValue("jane@example.com");
    });

    it("should update form data when image URL is changed", () => {
      render(<ProfileForm {...defaultProps} />);

      const imageInput = screen.getByLabelText("Profile Image URL");
      fireEvent.change(imageInput, { target: { value: "https://example.com/jane.jpg" } });

      expect(imageInput).toHaveValue("https://example.com/jane.jpg");
    });

    it("should handle empty image URL", () => {
      const userWithoutImage = { ...mockUser, image: null };
      render(<ProfileForm user={userWithoutImage} />);

      const imageInput = screen.getByLabelText("Profile Image URL");
      expect(imageInput).toHaveValue("");

      fireEvent.change(imageInput, { target: { value: "" } });
      expect(imageInput).toHaveValue("");
    });
  });

  describe("form submission", () => {
    it("should submit form with correct data", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByLabelText("Full Name");
      const emailInput = screen.getByLabelText("Email Address");
      const submitButton = screen.getByText("Update Profile");

      fireEvent.change(nameInput, { target: { value: "Jane Smith" } });
      fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Jane Smith",
            email: "jane@example.com",
            image: "https://example.com/john.jpg",
          }),
        });
      });
    });

    it("should show loading state during submission", async () => {
      (fetch as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => {
        setTimeout(() => resolve({ ok: true }), 100);
      }));

      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByText("Update Profile");
      fireEvent.click(submitButton);

      expect(submitButton).toHaveTextContent("Updating...");
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(submitButton).toHaveTextContent("Update Profile");
        expect(submitButton).not.toBeDisabled();
      }, 150);
    });

    it("should show success message on successful update", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByText("Update Profile");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Profile updated successfully");
      });
    });

    it("should show error message on failed update", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByText("Update Profile");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to update profile. Please try again."
        );
      });
    });

    it("should show error message on network error", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByText("Update Profile");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to update profile. Please try again."
        );
      });
    });

    it("should refresh router on successful update", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByText("Update Profile");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });
  });

  describe("cancel functionality", () => {
    it("should call router.back when cancel is clicked", () => {
      render(<ProfileForm {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe("form validation", () => {
    it("should have required attribute on name field", () => {
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByLabelText("Full Name");
      expect(nameInput).toHaveAttribute("required");
    });

    it("should have required attribute on email field", () => {
      render(<ProfileForm {...defaultProps} />);

      const emailInput = screen.getByLabelText("Email Address");
      expect(emailInput).toHaveAttribute("required");
    });

    it("should have email type on email field", () => {
      render(<ProfileForm {...defaultProps} />);

      const emailInput = screen.getByLabelText("Email Address");
      expect(emailInput).toHaveAttribute("type", "email");
    });

    it("should have url type on image field", () => {
      render(<ProfileForm {...defaultProps} />);

      const imageInput = screen.getByLabelText("Profile Image URL");
      expect(imageInput).toHaveAttribute("type", "url");
    });

    it("should not have required attribute on image field", () => {
      render(<ProfileForm {...defaultProps} />);

      const imageInput = screen.getByLabelText("Profile Image URL");
      expect(imageInput).not.toHaveAttribute("required");
    });
  });

  describe("accessibility", () => {
    it("should have proper labels for all inputs", () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      expect(screen.getByLabelText("Profile Image URL")).toBeInTheDocument();
    });

    it("should have proper htmlFor attributes on labels", () => {
      render(<ProfileForm {...defaultProps} />);

      const nameLabel = screen.getByText("Full Name");
      const emailLabel = screen.getByText("Email Address");
      const imageLabel = screen.getByText("Profile Image URL");

      expect(nameLabel).toHaveAttribute("for", "name");
      expect(emailLabel).toHaveAttribute("for", "email");
      expect(imageLabel).toHaveAttribute("for", "image");
    });

    it("should have accessible button text", () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText("Update Profile")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should have proper form structure", () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      expect(screen.getByLabelText("Profile Image URL")).toBeInTheDocument();
      expect(screen.getByText("Update Profile")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });
});