// ABOUTME: NextAuth.js middleware for route protection and authentication
// ABOUTME: Handles session validation and redirects for protected routes

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

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

  // If authenticated and trying to access auth pages
  if (session && pathname.startsWith("/auth")) {
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
});

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
