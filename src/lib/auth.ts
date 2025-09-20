// ABOUTME: NextAuth.js configuration for ProfiCo Inventory Management System
// ABOUTME: Handles magic link authentication with role-based access control

import { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { type UserRole } from "@/types/index";

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

export const { handlers, auth, signIn, signOut } = NextAuth(config);
