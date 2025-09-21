// Jest type declarations for ProfiCo Inventory Management System
// This file extends the Jest types to work with custom test setup

// Import jest-dom matchers
import '@testing-library/jest-dom';

// Extend the global Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toBeDisabled(): R;
      toHaveClass(...classNames: string[]): R;
    }
  }
}

// Mock file for Next.js navigation types
declare module 'next/navigation' {
  export interface useRouter {
    push: (href: string) => void;
    back: () => void;
    refresh: () => void;
    replace: (href: string) => void;
    prefetch: (href: string) => void;
  }

  export const useRouter: () => useRouter;
  export const useSearchParams: () => URLSearchParams;
  export const usePathname: () => string;
  export const useParams: () => Record<string, string>;
}

// Mock NextAuth types
declare module 'next-auth/react' {
  export interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: 'admin' | 'team_lead' | 'user';
    };
  }

  export interface useSessionResult {
    data: Session | null;
    status: 'loading' | 'authenticated' | 'unauthenticated';
    update: (data?: any) => Promise<void>;
  }

  export const useSession: () => useSessionResult;
  export const signIn: (provider?: string) => Promise<void>;
  export const signOut: () => Promise<void>;
}

// Mock Sonner toast types
declare module 'sonner' {
  export interface Toast {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  }

  export const toast: Toast;
}