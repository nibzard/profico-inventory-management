// ABOUTME: Client-side CSRF token utilities for ProfiCo Inventory Management System
// ABOUTME: Provides functions to fetch and manage CSRF tokens for forms and API requests

class CSRFManager {
  private token: string | null = null;
  private tokenPromise: Promise<string> | null = null;
  private readonly TOKEN_KEY = 'csrf_token';
  private readonly API_ENDPOINT = '/api/csrf-token';

  /**
   * Get CSRF token, fetching from server if needed
   */
  async getToken(): Promise<string> {
    // Return cached token if available
    if (this.token) {
      return this.token;
    }

    // Return existing promise if token is being fetched
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Fetch new token
    this.tokenPromise = this.fetchToken();
    const token = await this.tokenPromise;
    this.tokenPromise = null;
    
    return token;
  }

  /**
   * Fetch CSRF token from server
   */
  private async fetchToken(): Promise<string> {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'GET',
        credentials: 'include', // Important for cookies
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.csrfToken) {
        throw new Error('CSRF token not found in response');
      }

      // Store token in memory
      this.token = data.csrfToken;
      
      return this.token || '';
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }

  /**
   * Clear stored token (useful after logout)
   */
  clearToken(): void {
    this.token = null;
    this.tokenPromise = null;
  }

  /**
   * Add CSRF token to fetch options
   */
  async addTokenToRequest(options: RequestInit): Promise<RequestInit> {
    const token = await this.getToken();
    
    return {
      ...options,
      headers: {
        ...options.headers,
        'X-CSRF-Token': token || '',
      },
    };
  }

  /**
   * Create a secure fetch function with CSRF protection
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const secureOptions = await this.addTokenToRequest(options);
    
    return fetch(url, {
      ...secureOptions,
      credentials: 'include', // Important for cookies
    });
  }

  /**
   * Helper for POST requests with CSRF protection
   */
  async post(url: string, data: unknown): Promise<Response> {
    return this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * Helper for PUT requests with CSRF protection
   */
  async put(url: string, data: unknown): Promise<Response> {
    return this.fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * Helper for PATCH requests with CSRF protection
   */
  async patch(url: string, data: unknown): Promise<Response> {
    return this.fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * Helper for DELETE requests with CSRF protection
   */
  async delete(url: string): Promise<Response> {
    return this.fetch(url, {
      method: 'DELETE',
    });
  }

  /**
   * Add CSRF token to form data for traditional form submissions
   */
  async addTokenToForm(formData: FormData): Promise<void> {
    const token = await this.getToken();
    formData.set('csrf_token', token);
  }

  /**
   * Create a hidden CSRF input field for forms
   */
  async createCsrfInput(): Promise<HTMLInputElement> {
    const token = await this.getToken();
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'csrf_token';
    input.value = token;
    return input;
  }
}

// Export singleton instance
export const csrfManager = new CSRFManager();

// Export utility functions for convenience
export const getCsrfToken = () => csrfManager.getToken();
export const clearCsrfToken = () => csrfManager.clearToken();
export const secureFetch = (url: string, options?: RequestInit) => csrfManager.fetch(url, options);
export const securePost = (url: string, data: unknown) => csrfManager.post(url, data);
export const securePut = (url: string, data: unknown) => csrfManager.put(url, data);
export const securePatch = (url: string, data: unknown) => csrfManager.patch(url, data);
export const secureDelete = (url: string) => csrfManager.delete(url);

export default csrfManager;