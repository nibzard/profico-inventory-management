import '@testing-library/jest-dom'
import React from 'react'

// Mock Next.js router (Pages Router)
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

// Mock Next.js router (App Router) - create shared mock instance
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRefresh = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();

const mockRouter = {
  push: mockPush,
  back: mockBack,
  refresh: mockRefresh,
  replace: mockReplace,
  prefetch: mockPrefetch,
};

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => mockRouter),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
  useParams: jest.fn(() => ({})),
}))

// Export router mocks globally for test access
global.mockRouterInstance = mockRouter;

// Mock NextAuth.js
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock Sonner toast library
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
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
  Badge: ({ children, variant, ...props }) => {
    const variantClasses = {
      default: "bg-primary",
      secondary: "bg-secondary", 
      destructive: "bg-destructive",
      outline: "border-input bg-background"
    };
    const className = `${variantClasses[variant] || variantClasses.default} ${props.className || ''}`;
    return <span {...props} className={className}>{children}</span>;
  },
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

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  return {
    Button: ({ children, asChild, disabled, variant, size, onClick, type, ...props }) => {
      if (asChild) {
        // Forward disabled state and onClick to children
        return React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { disabled, onClick, type });
          }
          return child;
        });
      }
      // Add variant and size as data attributes for testing
      const buttonProps = {
        ...props,
        type: type || "button", // Properly handle type="submit"
        disabled,
        onClick,
        ...(variant && { 'data-variant': variant }),
        ...(size && { 'data-size': size }),
      };
      return <button {...buttonProps}>{children}</button>;
    },
  };
})

// Mock more UI components that might be missing
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
  CardDescription: ({ children, ...props }) => <p {...props}>{children}</p>,
  CardContent: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardFooter: ({ children, ...props }) => <div {...props}>{children}</div>,
}))

// Mock dialog components - simple approach that works with controlled state  
jest.mock('@/components/ui/dialog', () => {
  const React = require('react');
  
  const DialogTrigger = ({ children, asChild, onClick, ...props }) => {
    const handleClick = (e) => {
      onClick?.(e);
    };
    
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, { 
        ...children.props,
        onClick: handleClick,
      });
    }
    
    return <button {...props} onClick={handleClick}>{children}</button>;
  };
  
  const DialogContent = ({ children, ...props }) => (
    <div {...props} role="dialog">{children}</div>
  );
  
  return {
    Dialog: ({ children, open, onOpenChange, ...props }) => {
      return (
        <div {...props} data-testid="dialog">
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              // Handle DialogTrigger - always render but enhance with onOpenChange
              if (child.type === DialogTrigger) {
                return React.cloneElement(child, {
                  ...child.props,
                  onClick: () => {
                    child.props?.onClick?.();
                    onOpenChange?.(true);
                  }
                });
              }
              // Handle DialogContent - only render when open
              if (child.type === DialogContent) {
                return open ? child : null;
              }
            }
            return child;
          })}
        </div>
      );
    },
    DialogTrigger,
    DialogContent,
    DialogHeader: ({ children, ...props }) => <div {...props}>{children}</div>,
    DialogTitle: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
    DialogDescription: ({ children, ...props }) => <p {...props}>{children}</p>,
    DialogFooter: ({ children, ...props }) => <div {...props}>{children}</div>,
  };
})

// Mock form components - ensure they properly forward events
jest.mock('@/components/ui/form', () => ({
  Form: ({ children, onSubmit, ...props }) => <form onSubmit={onSubmit} {...props}>{children}</form>,
  FormField: ({ children, ...props }) => <div {...props}>{children}</div>,
  FormItem: ({ children, ...props }) => <div {...props}>{children}</div>,
  FormLabel: ({ children, ...props }) => <label {...props}>{children}</label>,
  FormControl: ({ children, ...props }) => <div {...props}>{children}</div>,
  FormDescription: ({ children, ...props }) => <p {...props}>{children}</p>,
  FormMessage: ({ children, ...props }) => <span {...props}>{children}</span>,
}))

// Mock select components with proper event handling and role attributes
jest.mock('@/components/ui/select', () => {
  const React = require('react');
  return {
    Select: ({ children, value, onValueChange, ...props }) => {
      const [isOpen, setIsOpen] = React.useState(false);
      
      return (
        <div data-value={value} data-testid="select" data-open={isOpen}>
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              // Pass selectedValue and onValueChange to all children
              return React.cloneElement(child, { 
                selectedValue: value, 
                onValueChange,
                isOpen,
                setIsOpen
              });
            }
            return child;
          })}
        </div>
      );
    },
    SelectTrigger: ({ children, ...allProps }) => {
      const { selectedValue, onValueChange, isOpen, setIsOpen, ...domProps } = allProps;
      
      const handleClick = () => {
        setIsOpen?.(!isOpen);
      };
      
      // Generate a unique ID for accessibility if not provided
      const id = domProps.id || React.useId?.() || `select-trigger-${Math.random().toString(36).substr(2, 9)}`;
      
      return (
        <button {...domProps} id={id} data-testid="select-trigger" onClick={handleClick}>
          {children}
        </button>
      );
    },
    SelectValue: ({ children, placeholder, ...allProps }) => {
      const { selectedValue, onValueChange, ...domProps } = allProps;
      return <span {...domProps}>{children || placeholder}</span>;
    },
    SelectContent: ({ children, ...allProps }) => {
      const { selectedValue, onValueChange, isOpen, ...domProps } = allProps;
      // Always render but hide with CSS for easier testing
      return (
        <div {...domProps} style={{ display: isOpen ? 'block' : 'none' }} data-open={isOpen}>
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              // Pass onValueChange to SelectItem children, but preserve their own value prop
              return React.cloneElement(child, { 
                selectedValue, // Pass the current selected value
                onValueChange 
              });
            }
            return child;
          })}
        </div>
      );
    },
    SelectItem: ({ children, value: itemValue, ...allProps }) => {
      const { selectedValue, onValueChange, ...domProps } = allProps;
      return (
        <div 
          {...domProps}
          role="option"
          onClick={() => onValueChange?.(itemValue)}
          data-value={itemValue}
        >
          {children}
        </div>
      );
    },
  };
})

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

// Mock separator component
jest.mock('@/components/ui/separator', () => ({
  Separator: ({ ...props }) => <hr {...props} />,
}))

// Mock popover component with controlled state handling
jest.mock('@/components/ui/popover', () => {
  const React = require('react');
  
  return {
    Popover: ({ children, open, onOpenChange, ...props }) => {
      const [internalOpen, setInternalOpen] = React.useState(false);
      const isControlled = open !== undefined;
      const isOpen = isControlled ? open : internalOpen;
      
      const handleOpenChange = React.useCallback((newOpen) => {
        if (!isControlled) {
          setInternalOpen(newOpen);
        }
        onOpenChange?.(newOpen);
      }, [isControlled, onOpenChange]);
      
      return (
        <div data-open={isOpen}>
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { 
                open: isOpen, 
                onOpenChange: handleOpenChange 
              });
            }
            return child;
          })}
        </div>
      );
    },
    PopoverTrigger: ({ children, asChild, ...props }) => {
      const { open, onOpenChange, ...buttonProps } = props;
      const handleClick = React.useCallback(() => {
        onOpenChange?.(!open);
      }, [open, onOpenChange]);
      
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, { 
          ...children.props,
          onClick: handleClick 
        });
      }
      
      return <button {...buttonProps} onClick={handleClick}>{children}</button>;
    },
    PopoverContent: ({ children, open, ...props }) => {
      return open ? <div {...props}>{children}</div> : null;
    },
  };
})


// Mock avatar component
jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }) => <div data-testid="avatar" {...props}>{children}</div>,
  AvatarImage: ({ src, alt, ...props }) => src ? <img data-testid="avatar-image" src={src} alt={alt} {...props} /> : null,
  AvatarFallback: ({ children, ...props }) => <div data-testid="avatar-fallback" {...props}>{children}</div>,
}))

// Mock dropdown menu component with better controlled state
jest.mock('@/components/ui/dropdown-menu', () => {
  const React = require('react');
  
  return {
    DropdownMenu: ({ children, ...props }) => {
      const [open, setOpen] = React.useState(false);
      
      return (
        <div {...props} data-testid="dropdown-menu">
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { open, setOpen });
            }
            return child;
          })}
        </div>
      );
    },
    DropdownMenuTrigger: ({ children, asChild, open, setOpen, ...props }) => {
      const handleClick = () => setOpen?.(!open);
      
      // Filter out non-DOM props before passing to elements
      const { open: _, setOpen: __, ...cleanProps } = props;
      
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, { 
          ...children.props,
          onClick: handleClick,
          role: "button"
        });
      }
      
      return <button {...cleanProps} onClick={handleClick} role="button">{children}</button>;
    },
    DropdownMenuContent: ({ children, open, setOpen, ...props }) => {
      // Filter out non-DOM props
      const { open: _, setOpen: __, ...cleanProps } = props;
      
      // Always render content for easier testing, but mark with data attribute
      return (
        <div {...cleanProps} data-open={open} style={{ display: open ? 'block' : 'none' }}>
          {children}
        </div>
      );
    },
    DropdownMenuItem: ({ children, asChild, ...props }) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, { 
          ...children.props,
          role: "menuitem"
        });
      }
      
      return <div {...props} role="menuitem">{children}</div>;
    },
    DropdownMenuSeparator: () => <hr />,
  };
})

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
  AlertTriangle: () => <svg data-testid="alert-triangle" />,
  MoreHorizontal: () => <svg data-testid="morehorizontal-icon" />,
  Check: () => <svg data-testid="check-icon" />,
  X: () => <svg data-testid="x-icon" />,
  Camera: () => <svg data-testid="camera-icon" />,
  QrCode: () => <svg data-testid="qrcode-icon" />,
  Scan: () => <svg data-testid="scan-icon" />,
  Eye: () => <svg data-testid="eye-icon" />,
  Edit: () => <svg data-testid="edit-icon" />,
  CheckCircle: () => <svg data-testid="check-circle" />,
  XCircle: () => <svg data-testid="x-circle" />,
  Clock: () => <svg data-testid="clock" />,
  ChevronLeft: () => <svg data-testid="chevronleft-icon" />,
  ChevronRight: () => <svg data-testid="chevronright-icon" />,
  Copy: () => <svg data-testid="copy-icon" />,
  Search: () => <svg data-testid="search-icon" />,
  Filter: () => <svg data-testid="filter-icon" />,
  Calendar: () => <svg data-testid="calendar-icon" />,
  Euro: () => <svg data-testid="euro-icon" />,
  MapPin: () => <svg data-testid="map-pin-icon" />,
  Tag: () => <svg data-testid="tag-icon" />,
  Building: () => <svg data-testid="building-icon" />,
  User: () => <svg data-testid="user-icon" />,
  SlidersHorizontal: () => <svg data-testid="sliders-icon" />,
}))

