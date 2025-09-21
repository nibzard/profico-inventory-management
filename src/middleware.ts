// ABOUTME: NextAuth.js middleware for route protection and authentication
// ABOUTME: Handles session validation and redirects for protected routes
// ABOUTME: Includes development bypass when DEVELOPMENT=true

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDevelopmentBypassEnabled, getDevelopmentSession } from "@/lib/dev-auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Get session from NextAuth or use development bypass
  let session;
  if (isDevelopmentBypassEnabled()) {
    session = getDevelopmentSession();
    console.log("🚀 Development mode: Using mock session in middleware");
  } else {
    session = await auth();
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/auth/signin", "/auth/signup"];

  // Admin-only routes
  const adminRoutes = ["/admin"];

  // Team lead and admin routes
  const managerRoutes = ["/requests/approve", "/equipment/assign"];

  // Check if the current path is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If not authenticated and trying to access protected route
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // If authenticated and trying to access auth pages, redirect to dashboard
  // Exception: in development mode, allow access to auth pages for testing
  if (session && pathname.startsWith("/auth") && !isDevelopmentBypassEnabled()) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Role-based access control
  if (session) {
    const userRole = session.user.role;

    // Admin route protection
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
      if (userRole !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Manager route protection (team_lead and admin)
    if (managerRoutes.some((route) => pathname.startsWith(route))) {
      if (userRole !== "admin" && userRole !== "team_lead") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
