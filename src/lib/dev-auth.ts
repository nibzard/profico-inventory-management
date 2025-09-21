// ABOUTME: Development authentication bypass for ProfiCo Inventory Management
// ABOUTME: Provides mock admin user session when DEVELOPMENT=true environment variable is set
// ABOUTME: SECURITY WARNING: This is for development only and should never be used in production

import { type UserRole } from "@/types/index";

// Development mock user - only used when DEVELOPMENT=true
export const DEV_MOCK_USER = {
  id: "dev-admin-user-001",
  email: "dev-admin@profico.com",
  name: "Development Admin",
  role: "admin" as UserRole,
  image: null,
};

// Development mock session
export const DEV_MOCK_SESSION = {
  user: DEV_MOCK_USER,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
};

/**
 * Check if development bypass mode is enabled
 * Only returns true if DEVELOPMENT environment variable is explicitly set to "true"
 */
export function isDevelopmentBypassEnabled(): boolean {
  return process.env.DEVELOPMENT === "true" && process.env.NODE_ENV === "development";
}

/**
 * Get development session if bypass is enabled
 * Returns mock admin session for development, null otherwise
 */
export function getDevelopmentSession() {
  if (isDevelopmentBypassEnabled()) {
    return DEV_MOCK_SESSION;
  }
  return null;
}

/**
 * Create development user in database if it doesn't exist
 * This ensures the mock user exists in the database for proper relationships
 */
export async function ensureDevelopmentUser(prisma: any) {
  if (!isDevelopmentBypassEnabled()) {
    return null;
  }

  try {
    // Check if development user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: DEV_MOCK_USER.id },
    });

    if (existingUser) {
      return existingUser;
    }

    // Create development user
    const devUser = await prisma.user.create({
      data: {
        id: DEV_MOCK_USER.id,
        email: DEV_MOCK_USER.email,
        name: DEV_MOCK_USER.name,
        role: DEV_MOCK_USER.role,
        emailVerified: new Date(),
      },
    });

    console.log("🚀 Development user created:", devUser.email);
    return devUser;
  } catch (error) {
    console.error("Error creating development user:", error);
    return null;
  }
}