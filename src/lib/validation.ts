// ABOUTME: Centralized validation and sanitization utilities for ProfiCo Inventory Management System
// ABOUTME: Provides input validation, sanitization, and security utilities for all API endpoints

import { z } from "zod";

// Sanitization utilities
export class InputSanitizer {
  // Remove potentially dangerous HTML/JS content
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .trim();
  }

  // Sanitize string for safe database storage
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return input;
    
    return this.sanitizeHtml(input.trim());
  }

  // Sanitize array of strings
  static sanitizeStringArray(input: string[]): string[] {
    if (!Array.isArray(input)) return input;
    
    return input.map(item => this.sanitizeString(item)).filter(Boolean);
  }

  // Validate and sanitize email
  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') return email;
    
    return email.toLowerCase().trim();
  }

  // Validate and sanitize numeric inputs
  static sanitizeNumber(input: string | number): number | null {
    if (typeof input === 'number') return input;
    if (typeof input !== 'string') return null;
    
    const num = parseFloat(input);
    return isNaN(num) ? null : num;
  }

  // Sanitize boolean inputs
  static sanitizeBoolean(input: string | boolean): boolean {
    if (typeof input === 'boolean') return input;
    if (typeof input !== 'string') return false;
    
    return input.toLowerCase() === 'true';
  }

  // Sanitize date inputs
  static sanitizeDate(input: string): Date | null {
    if (typeof input !== 'string') return null;
    
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : date;
  }

  // Sanitize file names
  static sanitizeFileName(input: string): string {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[^\w\s.-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
  }
}

// Common validation schemas
export const commonSchemas = {
  // Pagination parameters
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0, "Page must be positive").default(1),
    limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0 && n <= 100, "Limit must be between 1 and 100").default(12),
  }),

  // Search parameters
  search: z.object({
    search: z.string().max(200, "Search term too long").optional(),
    category: z.string().max(50).optional(),
    status: z.enum(['all', 'available', 'assigned', 'maintenance', 'broken', 'decommissioned']).optional(),
    owner: z.string().max(100).optional(),
    team: z.string().max(100).optional(),
    brand: z.string().max(100).optional(),
    location: z.string().max(200).optional(),
    purchaseMethod: z.enum(['all', 'profi_co', 'zopi', 'leasing', 'off_the_shelf']).optional(),
    priceMin: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid minimum price"), z.number()]).optional(),
    priceMax: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid maximum price"), z.number()]).optional(),
    purchaseDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    purchaseDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    tags: z.string().max(500).optional(),
  }),

  // Equipment status validation
  equipmentStatus: z.enum(['pending', 'available', 'assigned', 'maintenance', 'broken', 'decommissioned']),

  // User role validation
  userRole: z.enum(['admin', 'team_lead', 'user']),

  // Priority levels
  priority: z.enum(['low', 'medium', 'high', 'urgent']),

  // Request status
  requestStatus: z.enum(['pending', 'approved', 'rejected', 'ordered', 'fulfilled']),

  // Purchase method validation
  purchaseMethod: z.enum(['profi_co', 'zopi', 'leasing', 'off_the_shelf']),

  // File upload validation
  fileUpload: z.object({
    maxSize: z.number().positive(),
    allowedTypes: z.array(z.string()),
    maxFiles: z.number().positive().default(1),
  }),

  // ID validation
  cuid: z.string().cuid(),

  // Email validation
  email: z.string().email("Invalid email address"),

  // URL validation
  url: z.string().url("Invalid URL").optional().or(z.literal("")),

  // Phone number validation (basic international format)
  phone: z.string().regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number").optional(),
};

// Equipment-related schemas
export const equipmentSchemas = {
  create: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
    category: z.string().min(2, "Category required").max(50),
    brand: z.string().max(50).optional(),
    model: z.string().max(50).optional(),
    serialNumber: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
    purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    purchasePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
    purchaseMethod: commonSchemas.purchaseMethod,
    location: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
    tags: z.string().max(500).optional(),
  }),

  update: z.object({
    name: z.string().min(2).max(100).optional(),
    category: z.string().min(2).max(50).optional(),
    brand: z.string().max(50).optional(),
    model: z.string().max(50).optional(),
    serialNumber: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
    purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    purchasePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
    purchaseMethod: commonSchemas.purchaseMethod.optional(),
    status: commonSchemas.equipmentStatus.optional(),
    location: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
    tags: z.string().max(500).optional(),
  }),

  qrGenerate: z.object({
    quantity: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0 && n <= 100, "Quantity must be between 1 and 100").default(1),
  }),
};

// User-related schemas
export const userSchemas = {
  create: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: commonSchemas.email,
    password: z.string().min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    role: commonSchemas.userRole.default("user"),
    teamId: commonSchemas.cuid.optional(),
    phone: commonSchemas.phone.optional(),
    department: z.string().max(100).optional(),
    employeeId: z.string().max(50).optional(),
  }),

  update: z.object({
    name: z.string().min(2).max(100).optional(),
    email: commonSchemas.email.optional(),
    role: commonSchemas.userRole.optional(),
    teamId: commonSchemas.cuid.optional(),
    phone: commonSchemas.phone.optional(),
    department: z.string().max(100).optional(),
    employeeId: z.string().max(50).optional(),
    isActive: z.boolean().optional(),
  }),
};

// Request-related schemas
export const requestSchemas = {
  create: z.object({
    equipmentType: z.string().min(2, "Equipment type must be at least 2 characters").max(100),
    justification: z.string().min(20, "Justification must be at least 20 characters").max(2000),
    priority: commonSchemas.priority,
    specificRequirements: z.string().max(1000).optional(),
    budget: z.union([
      z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid budget format").transform(Number),
      z.number().positive("Budget must be positive")
    ]).optional(),
    neededBy: z.union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").transform(date => new Date(date)),
      z.date()
    ]).optional(),
  }),

  approve: z.object({
    notes: z.string().max(1000).optional(),
    equipmentId: commonSchemas.cuid.optional(),
  }),

  reject: z.object({
    reason: z.string().min(10, "Rejection reason must be at least 10 characters").max(1000),
    notes: z.string().max(1000).optional(),
  }),

  updateStatus: z.object({
    status: commonSchemas.requestStatus,
    notes: z.string().max(1000).optional(),
  }),
};

// Team-related schemas
export const teamSchemas = {
  create: z.object({
    name: z.string().min(2, "Team name must be at least 2 characters").max(100),
    description: z.string().max(1000).optional(),
    department: z.string().max(100).optional(),
    leaderId: commonSchemas.cuid.optional(),
  }),

  update: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(1000).optional(),
    department: z.string().max(100).optional(),
    leaderId: commonSchemas.cuid.optional(),
  }),
};

// Report-related schemas
export const reportSchemas = {
  generate: z.object({
    format: z.enum(['pdf', 'excel', 'csv']),
    type: z.enum(['inventory', 'assignment', 'value', 'maintenance']),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    category: z.string().max(50).optional(),
    status: commonSchemas.equipmentStatus.optional(),
    team: commonSchemas.cuid.optional(),
  }),
};

// File upload schemas
export const fileSchemas = {
  invoice: commonSchemas.fileUpload.extend({
    maxSize: z.literal(10 * 1024 * 1024), // 10MB
    allowedTypes: z.array(z.enum(['application/pdf', 'image/jpeg', 'image/png'])),
  }),

  equipmentImage: commonSchemas.fileUpload.extend({
    maxSize: z.literal(5 * 1024 * 1024), // 5MB
    allowedTypes: z.array(z.enum(['image/jpeg', 'image/png', 'image/webp'])),
  }),

  document: commonSchemas.fileUpload.extend({
    maxSize: z.literal(5 * 1024 * 1024), // 5MB
    allowedTypes: z.array(z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])),
  }),
};

// Validation helpers
export class ValidationHelper {
  // Validate and sanitize search parameters
  static validateSearchParams(searchParams: URLSearchParams) {
    const rawParams = Object.fromEntries(searchParams.entries());
    
    try {
      const validated = commonSchemas.search.parse(rawParams);
      
      // Sanitize string inputs
      const sanitized = {
        ...validated,
        search: validated.search ? InputSanitizer.sanitizeString(validated.search) : undefined,
        category: validated.category ? InputSanitizer.sanitizeString(validated.category) : undefined,
        brand: validated.brand ? InputSanitizer.sanitizeString(validated.brand) : undefined,
        location: validated.location ? InputSanitizer.sanitizeString(validated.location) : undefined,
        tags: validated.tags ? InputSanitizer.sanitizeString(validated.tags) : undefined,
      };
      
      // Parse numeric values
      if (typeof sanitized.priceMin === 'string') {
        sanitized.priceMin = InputSanitizer.sanitizeNumber(sanitized.priceMin) || undefined;
      }
      if (typeof sanitized.priceMax === 'string') {
        sanitized.priceMax = InputSanitizer.sanitizeNumber(sanitized.priceMax) || undefined;
      }
      
      // Parse dates
      if (sanitized.purchaseDateFrom) {
        sanitized.purchaseDateFrom = InputSanitizer.sanitizeDate(sanitized.purchaseDateFrom)?.toISOString().split('T')[0];
      }
      if (sanitized.purchaseDateTo) {
        sanitized.purchaseDateTo = InputSanitizer.sanitizeDate(sanitized.purchaseDateTo)?.toISOString().split('T')[0];
      }
      
      return sanitized;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid search parameters: ${error.issues.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Validate and sanitize pagination parameters
  static validatePaginationParams(searchParams: URLSearchParams) {
    const rawParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '12',
    };
    
    try {
      return commonSchemas.pagination.parse(rawParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid pagination parameters: ${error.issues.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Sanitize database query results
  static sanitizeDbResults<T>(data: T): T {
    if (typeof data !== 'object' || data === null) return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeDbResults(item)) as T;
    }
    
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (typeof value === 'string') {
        sanitized[key] = InputSanitizer.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDbResults(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized as T;
  }
}

// Security validation middleware utilities
export const securityValidation = {
  // Validate request source
  validateRequestSource: (request: Request) => {
    const origin = request.headers.get('origin');
    
    // Allow localhost in development
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    // Check against allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (origin && !allowedOrigins.includes(origin)) {
      throw new Error('Invalid origin');
    }
    
    return true;
  },

  // Rate limiting helper
  validateRateLimit: () => {
    // This would be implemented with Redis or similar in production
    // For now, it's a placeholder
    return true;
  },

  // Content Security Policy validation
  validateCSP: () => {
    // Additional CSP validation logic would go here
    return true;
  },
};

// Subscription-related schemas
export const subscriptionSchemas = {
  create: z.object({
    softwareName: z.string().min(2, "Software name must be at least 2 characters").max(100, "Software name too long"),
    assignedUserId: commonSchemas.cuid,
    assignedUserEmail: commonSchemas.email,
    price: z.number().min(0, "Price must be non-negative"),
    billingFrequency: z.enum(['monthly', 'yearly'], {
      errorMap: () => ({ message: "Billing frequency must be 'monthly' or 'yearly'" })
    }) as any,
    paymentMethod: z.enum(['company_card', 'personal_card'], {
      errorMap: () => ({ message: "Payment method must be 'company_card' or 'personal_card'" })
    }) as any,
    invoiceRecipient: commonSchemas.email,
    isReimbursement: z.boolean().default(false),
    isActive: z.boolean().default(true),
    renewalDate: z.date(),
    vendor: z.string().max(100, "Vendor name too long").optional(),
    licenseKey: z.string().max(200, "License key too long").optional(),
    notes: z.string().max(2000, "Notes too long").optional(),
  }),

  update: z.object({
    softwareName: z.string().min(2, "Software name must be at least 2 characters").max(100, "Software name too long").optional(),
    assignedUserId: commonSchemas.cuid.optional(),
    assignedUserEmail: commonSchemas.email.optional(),
    price: z.number().min(0, "Price must be non-negative").optional(),
    billingFrequency: z.enum(['monthly', 'yearly']).optional(),
    paymentMethod: z.enum(['company_card', 'personal_card']).optional(),
    invoiceRecipient: commonSchemas.email.optional(),
    isReimbursement: z.boolean().optional(),
    isActive: z.boolean().optional(),
    renewalDate: z.date().optional(),
    vendor: z.string().max(100, "Vendor name too long").optional(),
    licenseKey: z.string().max(200, "License key too long").optional(),
    notes: z.string().max(2000, "Notes too long").optional(),
  }),

  search: z.object({
    search: z.string().max(200, "Search term too long").optional(),
    softwareName: z.string().max(100).optional(),
    vendor: z.string().max(100).optional(),
    assignedUserId: commonSchemas.cuid.optional(),
    billingFrequency: z.enum(['monthly', 'yearly']).optional(),
    paymentMethod: z.enum(['company_card', 'personal_card']).optional(),
    isActive: z.boolean().optional(),
    isReimbursement: z.boolean().optional(),
    renewalDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    renewalDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  }),
};

// Equipment schema for forms
export const equipmentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  brand: z.string().max(50, "Brand too long").optional(),
  model: z.string().max(50, "Model too long").optional(),
  serialNumber: z.string().min(1, "Serial number is required").max(100, "Serial number too long"),
  category: z.string().min(2, "Category is required").max(50, "Category too long"),
  status: commonSchemas.equipmentStatus.default("available"),
  purchaseDate: z.date(),
  purchasePrice: z.number().min(0, "Purchase price must be non-negative"),
  currentValue: z.number().min(0, "Current value must be non-negative").optional(),
  warrantyExpiry: z.date().optional().nullable(),
  lastMaintenanceDate: z.date().optional().nullable(),
  nextMaintenanceDate: z.date().optional().nullable(),
  location: z.string().max(200, "Location too long").optional(),
  description: z.string().max(1000, "Description too long").optional(),
  notes: z.string().max(2000, "Notes too long").optional(),
  imageUrl: commonSchemas.url.optional(),
  teamId: commonSchemas.cuid.optional().nullable(),
});

// Export everything that's already been exported above