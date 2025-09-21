// ABOUTME: NextAuth.js configuration for ProfiCo Inventory Management System
// ABOUTME: Handles magic link authentication with role-based access control
// ABOUTME: Includes development bypass mode when DEVELOPMENT=true

import { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { type UserRole } from "@/types/index";
import { 
  isDevelopmentBypassEnabled, 
  getDevelopmentSession, 
  ensureDevelopmentUser,
  DEV_MOCK_USER 
} from "./dev-auth";

export const config = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || "noreply@profico-inventory.com",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email }) {
      // Development bypass - always allow signin in development mode
      if (isDevelopmentBypassEnabled()) {
        console.log("🚀 Development mode: Bypassing authentication");
        await ensureDevelopmentUser(prisma);
        return true;
      }

      // For magic link authentication, check if user exists
      if (account?.provider === "resend") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          // If user doesn't exist, create them with default role
          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || user.email!.split('@')[0],
                role: "user" as UserRole, // Default role - can be changed by admin later
                emailVerified: new Date(),
              },
            });
          }

          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // Development bypass - use mock user data
      if (isDevelopmentBypassEnabled()) {
        token.id = DEV_MOCK_USER.id;
        token.role = DEV_MOCK_USER.role;
        token.email = DEV_MOCK_USER.email;
        return token;
      }

      // Always fetch user data from database to ensure we have the latest role
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { role: true, id: true },
        });
        
        if (dbUser) {
          token.role = dbUser.role as UserRole;
          token.id = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Development bypass - return mock session
      if (isDevelopmentBypassEnabled()) {
        return {
          user: {
            id: DEV_MOCK_USER.id,
            email: DEV_MOCK_USER.email,
            name: DEV_MOCK_USER.name,
            role: DEV_MOCK_USER.role,
            image: DEV_MOCK_USER.image,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
      }

      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;

export const { handlers, auth: nextAuth, signIn, signOut } = NextAuth(config);

// Custom auth function that handles development bypass
export async function auth() {
  // In development mode, return mock session if bypass is enabled
  if (isDevelopmentBypassEnabled()) {
    console.log("🚀 Development mode: Using mock admin session");
    await ensureDevelopmentUser(prisma);
    return getDevelopmentSession();
  }
  
  // Otherwise use normal NextAuth
  return await nextAuth();
}
