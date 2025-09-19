// ABOUTME: Client-side sign out button component for ProfiCo Inventory Management System
// ABOUTME: Handles user sign out using NextAuth.js with proper redirect

"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
      Sign Out
    </Button>
  );
}
