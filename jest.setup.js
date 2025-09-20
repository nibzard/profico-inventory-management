import '@testing-library/jest-dom'
import React from 'react'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock NextAuth.js
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}))

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock missing shadcn/ui components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }) => <span {...props}>{children}</span>,
}))

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onChange, ...props }) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={onChange}
      {...props} 
    />
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }) => 
    asChild ? children : <button {...props}>{children}</button>,
}))

// Mock more UI components that might be missing
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
  CardDescription: ({ children, ...props }) => <p {...props}>{children}</p>,
  CardContent: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardFooter: ({ children, ...props }) => <div {...props}>{children}</div>,
}))

// Mock dialog components
jest.mock('@/components/ui/dialog', () => {
  // State to manage dialog openness
  let isOpen = false;
  
  return {
    Dialog: ({ children, open, onOpenChange, ...props }) => {
      if (open !== undefined) isOpen = open;
      return (
        <div {...props} data-testid="dialog">
          {React.Children.map(children, child => {
            if (child.type?.name === 'DialogContent') {
              return isOpen ? child : null;
            }
            return child;
          })}
        </div>
      );
    },
    DialogTrigger: ({ children, asChild, ...props }) => {
      const handleClick = () => {
        isOpen = true;
      };
      return asChild ? 
        React.cloneElement(children, { onClick: handleClick }) : 
        <button {...props} onClick={handleClick}>{children}</button>;
    },
    DialogContent: ({ children, ...props }) => <div {...props} role="dialog">{children}</div>,
    DialogHeader: ({ children, ...props }) => <div {...props}>{children}</div>,
    DialogTitle: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
  };
})

// Mock form components
jest.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }) => <form {...props}>{children}</form>,
  FormField: ({ children, ...props }) => <div {...props}>{children}</div>,
  FormItem: ({ children, ...props }) => <div {...props}>{children}</div>,
  FormLabel: ({ children, ...props }) => <label {...props}>{children}</label>,
  FormControl: ({ children, ...props }) => <div {...props}>{children}</div>,
  FormDescription: ({ children, ...props }) => <p {...props}>{children}</p>,
  FormMessage: ({ children, ...props }) => <span {...props}>{children}</span>,
}))

// Mock select components
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }) => <div {...props}>{children}</div>,
  SelectTrigger: ({ children, ...props }) => <button {...props}>{children}</button>,
  SelectValue: ({ children, ...props }) => <span {...props}>{children}</span>,
  SelectContent: ({ children, ...props }) => <div {...props}>{children}</div>,
  SelectItem: ({ children, ...props }) => <div {...props}>{children}</div>,
}))

// Mock textarea component
jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ children, ...props }) => <textarea {...props}>{children}</textarea>,
}))

// Mock input component
jest.mock('@/components/ui/input', () => ({
  Input: ({ children, ...props }) => <input {...props}>{children}</input>,
}))

// Mock label component
jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }) => <label {...props}>{children}</label>,
}))


// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Trash2: () => <svg data-testid="trash2-icon" />,
  UserPlus: () => <svg data-testid="userplus-icon" />,
  UserMinus: () => <svg data-testid="userminus-icon" />,
  Wrench: () => <svg data-testid="wrench-icon" />,
  Archive: () => <svg data-testid="archive-icon" />,
  Download: () => <svg data-testid="download-icon" />,
  Upload: () => <svg data-testid="upload-icon" />,
  Package: () => <svg data-testid="package-icon" />,
  AlertTriangle: () => <svg data-testid="alerttriangle-icon" />,
  MoreHorizontal: () => <svg data-testid="morehorizontal-icon" />,
  Check: () => <svg data-testid="check-icon" />,
  X: () => <svg data-testid="x-icon" />,
  Camera: () => <svg data-testid="camera-icon" />,
  QrCode: () => <svg data-testid="qrcode-icon" />,
  Scan: () => <svg data-testid="scan-icon" />,
}))

