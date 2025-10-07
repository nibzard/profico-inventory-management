// ABOUTME: NextAuth.js API route handlers for authentication endpoints
// ABOUTME: Handles all authentication requests including sign in, sign out, and callbacks

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

export const runtime = "nodejs";
