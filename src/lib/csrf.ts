// ABOUTME: CSRF protection utilities for ProfiCo Inventory Management System
// ABOUTME: Provides CSRF token generation and validation for state-changing operations

import { NextRequest } from 'next/server';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

export class CSRFProtection {
  private static readonly CSRF_TOKEN_LENGTH = 32;
  private static readonly CSRF_COOKIE_NAME = 'csrf_token';
  private static readonly CSRF_HEADER_NAME = 'X-CSRF-Token';

  /**
   * Generate a new CSRF token
   */
  static generateToken(): string {
    return randomBytes(this.CSRF_TOKEN_LENGTH).toString('hex');
  }

  /**
   * Hash a CSRF token for storage (don't store the raw token)
   */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate CSRF token from request
   */
  static validateToken(request: NextRequest, storedTokenHash: string): boolean {
    try {
      // Get token from header first, then fallback to form data
      let token = request.headers.get(this.CSRF_HEADER_NAME);
      
      if (!token && request.method === 'POST') {
        // Try to get from form data
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/x-www-form-urlencoded') || 
            contentType?.includes('multipart/form-data')) {
          // For form data, we'll need to parse it manually
          // This is a simplified check - in production you'd want proper form parsing
          const url = new URL(request.url);
          token = url.searchParams.get('csrf_token');
        }
      }

      if (!token) {
        return false;
      }

      // Hash the provided token and compare with stored hash
      const providedHash = this.hashToken(token);
      return timingSafeEqual(Buffer.from(providedHash, 'hex'), Buffer.from(storedTokenHash, 'hex'));
    } catch (error) {
      console.error('CSRF validation error:', error);
      return false;
    }
  }

  /**
   * Check if CSRF protection is required for the request
   */
  static isProtectionRequired(request: NextRequest): boolean {
    // Only protect state-changing methods
    const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    return protectedMethods.includes(request.method);
  }

  /**
   * Check if request is exempt from CSRF protection
   */
  static isExempt(request: NextRequest): boolean {
    // Exempt API routes that are meant to be called from external services
    const exemptPaths = [
      '/api/auth/',
      '/api/webhooks/',
      '/api/uploadthing/', // Uploadthing has its own CSRF protection
      '/api/export/',      // Export endpoints might be called from external systems
    ];

    const pathname = new URL(request.url).pathname;
    return exemptPaths.some(path => pathname.startsWith(path));
  }

  /**
   * Get stored CSRF token hash from session
   */
  static getStoredTokenHash(request: NextRequest): string | null {
    // In a real implementation, this would come from the user's session
    // For now, we'll use a cookie-based approach
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    return cookies[this.CSRF_COOKIE_NAME] || null;
  }

  /**
   * Middleware to apply CSRF protection
   */
  static async apply(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
    // Skip CSRF check if not required or exempt
    if (!this.isProtectionRequired(request) || this.isExempt(request)) {
      return { valid: true };
    }

    // Get stored token hash
    const storedTokenHash = this.getStoredTokenHash(request);
    if (!storedTokenHash) {
      return { 
        valid: false, 
        error: 'CSRF token not found. Please refresh the page and try again.' 
      };
    }

    // Validate the token
    if (!this.validateToken(request, storedTokenHash)) {
      return { 
        valid: false, 
        error: 'Invalid CSRF token. Please refresh the page and try again.' 
      };
    }

    return { valid: true };
  }

  /**
   * Generate and set CSRF token in response
   */
  static generateAndSetToken(): { token: string; tokenHash: string; setCookieHeader: string } {
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);

    // Create secure cookie header
    const cookieValue = `${this.CSRF_COOKIE_NAME}=${tokenHash}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`;
    
    return {
      token, // Return the raw token to be embedded in forms/headers
      tokenHash,
      setCookieHeader: cookieValue,
    };
  }

  /**
   * Get CSRF token endpoint for client-side initialization
   */
  static async getCsrfToken(request: NextRequest): Promise<{ token: string; setCookieHeader: string }> {
    const { token, setCookieHeader } = this.generateAndSetToken();
    
    return {
      token,
      setCookieHeader,
    };
  }
}

/**
 * Helper function to apply CSRF protection to API routes
 */
export async function withCSRFProtection(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<Response>
): Promise<Response> {
  const result = await CSRFProtection.apply(request);
  
  if (!result.valid) {
    return new Response(
      JSON.stringify({ error: result.error || 'CSRF validation failed' }),
      { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  return handler(request);
}

export { CSRFProtection as default };