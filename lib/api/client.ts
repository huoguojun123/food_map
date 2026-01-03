// API client base class
// Provides typed HTTP methods with error handling and retry logic

import type { FoodSpot, CreateSpotDto, AiExtractionResult } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
const MAX_RETRIES = 2;

/**
 * API error type
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) throw error;

      // Only retry on network errors or 5xx status
      if (error instanceof ApiError) {
        if (error.statusCode && error.statusCode < 500) {
          throw error; // Don't retry client errors
        }
      }

      const delay = Math.pow(2, i) * 1000; // 1s, 2s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Unified API client class
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic GET request
   */
  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * Generic POST request
   */
  async post<T>(path: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>('POST', path, data, options);
  }

  /**
   * Generic PUT request
   */
  async put<T>(path: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>('PUT', path, data, options);
  }

  /**
   * Generic DELETE request
   */
  async delete(path: string, options?: RequestInit): Promise<void> {
    await this.request<void>('DELETE', path, undefined, options);
  }

  /**
   * Generic request method with error handling
   */
  private async request<T>(
    method: string,
    path: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    return retryWithBackoff(async () => {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = response.statusText;
        }

        throw new ApiError(
          errorData?.error || response.statusText,
          response.status,
          errorData
        );
      }

      return response.json() as Promise<T>;
    });
  }

  /**
   * Upload file (multipart/form-data)
   */
  async uploadFile<T>(path: string, file: File, fieldName = 'file'): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const formData = new FormData();
    formData.append(fieldName, file);

    return retryWithBackoff(async () => {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = response.statusText;
        }

        throw new ApiError(
          errorData?.error || response.statusText,
          response.status,
          errorData
        );
      }

      return response.json() as Promise<T>;
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

export default ApiClient;
