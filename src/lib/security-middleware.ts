// ABOUTME: Security middleware for ProfiCo Inventory Management System
// ABOUTME: Provides comprehensive security checks for all API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { securityValidation, InputSanitizer } from './validation';
import { CSRFProtection } from './csrf';

export class SecurityMiddleware {
  /**
   * Main security middleware function
   * Apply this to all API routes for comprehensive protection
   */
  static async apply(request: NextRequest, options: SecurityOptions = {}) {
    try {
      // Validate request source
      if (!securityValidation.validateRequestSource(request)) {
        return NextResponse.json(
          { error: 'Invalid request origin' },
          { status: 403 }
        );
      }

      // Check rate limiting
      if (!securityValidation.validateRateLimit()) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }

      // Validate Content Security Policy
      if (!securityValidation.validateCSP()) {
        return NextResponse.json(
          { error: 'Content Security Policy violation' },
          { status: 403 }
        );
      }

      // Check for malicious headers
      if (this.containsMaliciousHeaders(request)) {
        return NextResponse.json(
          { error: 'Malicious request headers detected' },
          { status: 400 }
        );
      }

      // CSRF protection for state-changing requests
      if (options.enableCSRF !== false && CSRFProtection.isProtectionRequired(request)) {
        const csrfResult = await CSRFProtection.apply(request);
        if (!csrfResult.valid) {
          return NextResponse.json(
            { error: csrfResult.error || 'CSRF validation failed' },
            { status: 403 }
          );
        }
      }

      // Sanitize request body if present
      let sanitizedBody = null;
      if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
        const contentType = request.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          const body = await request.clone().json();
          sanitizedBody = this.sanitizeRequestBody(body);
          
          // Reconstruct the request with sanitized body
          const newRequest = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(sanitizedBody),
          });
          request = newRequest as NextRequest;
        }
      }

      // Authentication check if required
      if (options.requireAuth) {
        const session = await auth();
        if (!session) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }

        // Role-based access control
        if (options.requiredRoles && !options.requiredRoles.includes(session.user.role)) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }

        // Add user info to request for downstream use
        (request as Request & { user?: unknown }).user = session.user;
      }

      // Return null if all checks pass (continue processing)
      return null;

    } catch (error) {
      console.error('Security middleware error:', error);
      return NextResponse.json(
        { error: 'Security validation failed' },
        { status: 500 }
      );
    }
  }

  /**
   * Get identifier for rate limiting
   */
  private static getRateLimitIdentifier(request: NextRequest): string {
    // Use IP address as primary identifier
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded || realIp || 'unknown';
    
    // Add user agent for more granular rate limiting
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    return `${ip}:${userAgent}`;
  }

  /**
   * Check for malicious headers
   */
  private static containsMaliciousHeaders(request: NextRequest): boolean {
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-original-host',
      'x-rewrite-url',
      'x-forwarded-server',
    ];

    return suspiciousHeaders.some(header => {
      const value = request.headers.get(header);
      return value && this.containsSuspiciousPatterns(value);
    });
  }

  /**
   * Check for suspicious patterns in input
   */
  private static containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /eval\(/i,
      /expression\(/i,
      /vbscript:/i,
      /data:/i,
      /@import/i,
      /-\moz-binding/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize request body recursively
   */
  private static sanitizeRequestBody(body: unknown): unknown {
    if (typeof body === 'string') {
      return InputSanitizer.sanitizeString(body);
    }

    if (Array.isArray(body)) {
      return body.map(item => this.sanitizeRequestBody(item));
    }

    if (typeof body === 'object' && body !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body)) {
        // Skip file objects and binary data
        if (value instanceof File || value instanceof Blob) {
          sanitized[key] = value;
        } else {
          sanitized[key] = this.sanitizeRequestBody(value);
        }
      }
      return sanitized as typeof body;
    }

    return body;
  }

  /**
   * Security headers to add to responses
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    };
  }

  /**
   * Apply security headers to response
   */
  static applySecurityHeaders(response: NextResponse): NextResponse {
    const headers = this.getSecurityHeaders();
    
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    return response;
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: File,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      maxFiles?: number;
    } = {}
  ): { valid: boolean; error?: string } {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
    } = options;

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`,
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`,
      };
    }

    // Check file name for suspicious patterns
    if (this.containsSuspiciousPatterns(file.name)) {
      return {
        valid: false,
        error: 'File name contains suspicious patterns',
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize file name
   */
  static sanitizeFileName(fileName: string): string {
    return InputSanitizer.sanitizeFileName(fileName);
  }

  /**
   * Check for SQL injection patterns
   */
  static containsSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|ALTER|CREATE|TRUNCATE)(\s|$)/i,
      /(\s|^)(FROM|INTO|WHERE|SET|VALUES)(\s|$)/i,
      /['";\\]/,
      /\/\*|\*\//,
      /--/,
      /xp_/i,
      /sp_/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check for NoSQL injection patterns
   */
  static containsNoSqlInjection(input: string): boolean {
    const nosqlPatterns = [
      /\$where/i,
      /\$ne/i,
      /\$gt/i,
      /\$lt/i,
      /\$regex/i,
      /\$exists/i,
      /javascript\s*:/i,
      /db\./i,
    ];

    return nosqlPatterns.some(pattern => pattern.test(input));
  }
}

export interface SecurityOptions {
  /**
   * Whether authentication is required
   */
  requireAuth?: boolean;

  /**
   * Required user roles (if authentication is required)
   */
  requiredRoles?: ('admin' | 'team_lead' | 'user')[];

  /**
   * Whether to enable rate limiting
   */
  enableRateLimit?: boolean;

  /**
   * Rate limit window in milliseconds
   */
  rateLimitWindow?: number;

  /**
   * Maximum requests per window
   */
  rateLimitMax?: number;

  /**
   * Whether to enable CSRF protection (defaults to true for authenticated requests)
   */
  enableCSRF?: boolean;
}

/**
 * Helper function to apply security middleware to API routes
 */
export async function withSecurity(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  options?: SecurityOptions
): Promise<NextResponse> {
  // Apply security middleware
  const securityResult = await SecurityMiddleware.apply(request, options);
  
  // If security check failed, return the error response
  if (securityResult) {
    return securityResult;
  }

  // Execute the handler
  let response = await handler(request);

  // Apply security headers
  response = SecurityMiddleware.applySecurityHeaders(response);

  return response;
}

export { SecurityMiddleware as default };