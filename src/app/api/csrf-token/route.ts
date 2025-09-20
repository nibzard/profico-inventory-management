// ABOUTME: CSRF token endpoint for ProfiCo Inventory Management System
// ABOUTME: Provides CSRF tokens for client-side forms and AJAX requests

import { NextRequest, NextResponse } from 'next/server';
import { CSRFProtection } from '@/lib/csrf';
import { SecurityMiddleware } from '@/lib/security-middleware';

export async function GET(request: NextRequest) {
  // Apply security middleware (allow public access for CSRF token)
  const securityResult = await SecurityMiddleware.apply(request, {
    requireAuth: false, // CSRF tokens can be requested without authentication
    enableRateLimit: true,
  });

  if (securityResult) {
    return securityResult;
  }

  try {
    // Generate CSRF token
    const { token, setCookieHeader } = await CSRFProtection.getCsrfToken(request);

    // Create response with CSRF token
    const response = NextResponse.json({
      csrfToken: token,
      message: 'CSRF token generated successfully',
    });

    // Set CSRF token cookie
    response.headers.set('Set-Cookie', setCookieHeader);

    // Apply security headers
    return SecurityMiddleware.applySecurityHeaders(response);
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}