// ABOUTME: Development login button component for ProfiCo Inventory Management
// ABOUTME: Shows a quick admin login button when DEVELOPMENT=true environment variable is set
// ABOUTME: Only renders in development mode for security

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, User } from "lucide-react";

export function DevLoginButton() {
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if development mode is enabled
    fetch("/api/auth/dev-login")
      .then((res) => res.json())
      .then((data) => {
        setIsDevelopmentMode(data.developmentMode);
      })
      .catch((error) => {
        console.error("Failed to check development mode:", error);
      });
  }, []);

  const handleDevLogin = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Redirect to dashboard after successful dev login
        router.push("/dashboard");
        router.refresh(); // Force a refresh to update auth state
      } else {
        console.error("Development login failed:", data.error);
      }
    } catch (error) {
      console.error("Development login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything if not in development mode
  if (!isDevelopmentMode) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800">
          Development Mode
        </span>
      </div>
      <p className="text-xs text-amber-700 mb-3">
        Quick login for development and testing. This button only appears when 
        DEVELOPMENT=true environment variable is set.
      </p>
      <Button
        onClick={handleDevLogin}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="w-full border-amber-300 text-amber-800 hover:bg-amber-100"
      >
        <User className="h-4 w-4 mr-2" />
        {isLoading ? "Logging in..." : "Login as Admin (Dev)"}
      </Button>
    </div>
  );
}