/**
 * API Client Service Layer
 * 
 * Provides a centralized interface for making API calls with
 * built-in error handling, caching, and request management.
 */

import { env } from '../config/env';

// Types for API responses and errors
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * API Client singleton for making HTTP requests
 * Uses fetch API with consistent error handling and response formatting
 */
export class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  private constructor() {
    this.baseUrl = env.NEXT_PUBLIC_API_BASE_URL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Get the singleton instance of ApiClient
   */
  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Configure the API client with custom options
   */
  public configure(options: { baseUrl?: string, defaultHeaders?: HeadersInit }) {
    if (options.baseUrl) {
      this.baseUrl = options.baseUrl;
    }
    if (options.defaultHeaders) {
      this.defaultHeaders = {
        ...this.defaultHeaders,
        ...options.defaultHeaders,
      };
    }
  }

  /**
   * Generic request method for all HTTP methods
   */
  private async request<T>(
    endpoint: string, 
    method: string, 
    data?: any, 
    customHeaders?: HeadersInit,
    options?: RequestInit
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const headers = { ...this.defaultHeaders, ...customHeaders };
    
    const config: RequestInit = {
      method,
      headers,
      ...options,
      next: { tags: [endpoint] }, // Enable Next.js tag-based revalidation
    };

    // Add body for non-GET requests if data exists
    if (method !== 'GET' && data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      return this.handleResponse<T>(response);
    } catch (error) {
      // Handle network errors or other exceptions
      console.error(`API request failed: ${url}`, error);
      throw new ApiError(
        0, 
        error instanceof Error ? error.message : 'Network request failed',
        { url, method }
      );
    }
  }

  /**
   * Process API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Check if the response has JSON content
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    // Parse response based on content type
    const data = isJson ? await response.json() : await response.text();
    
    // Handle error responses
    if (!response.ok) {
      const message = isJson && data.message 
        ? data.message 
        : `API error: ${response.status} ${response.statusText}`;
      
      throw new ApiError(response.status, message, data);
    }
    
    return data as T;
  }

  /**
   * Build complete URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    // Handle absolute URLs
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    // Handle relative URLs
    const baseUrl = this.baseUrl.endsWith('/') 
      ? this.baseUrl.slice(0, -1) 
      : this.baseUrl;
      
    const normalizedEndpoint = endpoint.startsWith('/') 
      ? endpoint 
      : `/${endpoint}`;
      
    return `${baseUrl}${normalizedEndpoint}`;
  }

  /**
   * HTTP GET request
   */
  public async get<T>(
    endpoint: string, 
    customHeaders?: HeadersInit,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, 'GET', undefined, customHeaders, options);
  }

  /**
   * HTTP POST request
   */
  public async post<T>(
    endpoint: string, 
    data?: any, 
    customHeaders?: HeadersInit,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, 'POST', data, customHeaders, options);
  }

  /**
   * HTTP PUT request
   */
  public async put<T>(
    endpoint: string, 
    data?: any, 
    customHeaders?: HeadersInit,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, 'PUT', data, customHeaders, options);
  }

  /**
   * HTTP PATCH request
   */
  public async patch<T>(
    endpoint: string, 
    data?: any, 
    customHeaders?: HeadersInit,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, 'PATCH', data, customHeaders, options);
  }

  /**
   * HTTP DELETE request
   */
  public async delete<T>(
    endpoint: string, 
    customHeaders?: HeadersInit,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, 'DELETE', undefined, customHeaders, options);
  }
}

// Export a singleton instance for direct use
export const apiClient = ApiClient.getInstance();

export default apiClient; 