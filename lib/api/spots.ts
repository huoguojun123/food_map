// Spots API client functions
// Provides type-safe API calls for restaurant operations

import { apiClient } from './client';
import type { FoodSpot, CreateSpotDto, AiExtractionResult, UpdateSpotDto } from '../types/index';

/**
 * Extract restaurant info from image or text using AI
 */
export async function extractSpotInfo(
  input: { type: 'image' | 'text' | 'url'; image?: string; text?: string; url?: string }
): Promise<AiExtractionResult> {
  const response = await apiClient.post<{ success: boolean; data: AiExtractionResult; error?: string }>(
    '/api/ai/extract',
    input
  );

  if (!response.success || !response.data) {
    throw new Error(response.error || 'AI extraction failed');
  }

  return response.data;
}

/**
 * Create a new food spot
 */
export async function createSpot(data: CreateSpotDto): Promise<FoodSpot> {
  const response = await apiClient.post<FoodSpot>('/api/spots', data);
  return response;
}

/**
 * Get list of all spots
 */
export async function listSpots(): Promise<FoodSpot[]> {
  const response = await apiClient.get<{ spots: FoodSpot[] }>('/api/spots');
  return response.spots;
}

/**
 * Get a specific spot by ID
 */
export async function getSpot(id: number): Promise<FoodSpot> {
  const response = await apiClient.get<FoodSpot>(`/api/spots/${id}`);
  return response;
}

/**
 * Update a spot by ID
 */
export async function updateSpot(id: number, data: UpdateSpotDto): Promise<FoodSpot> {
  const response = await apiClient.put<FoodSpot>(`/api/spots/${id}`, data);
  return response;
}

/**
 * Delete a spot by ID
 */
export async function deleteSpot(id: number): Promise<void> {
  await apiClient.delete(`/api/spots/${id}`);
}

/**
 * Geocode address to coordinates
 */
export async function geocodeAddress(
  address: string,
  city?: string
): Promise<{
  candidates: Array<{
    formatted_address: string
    province?: string
    city?: string
    district?: string
    township?: string
    adcode?: string
    lat: number
    lng: number
  }>
}> {
  const response = await apiClient.post<{
    success: boolean;
    data: {
      candidates: Array<{
        formatted_address: string;
        province?: string;
        city?: string;
        district?: string;
        township?: string;
        adcode?: string;
        lat: number;
        lng: number;
      }>;
    };
    error?: string;
  }>('/api/ai/geocode', { address, city });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Geocoding failed');
  }

  return {
    candidates: response.data.candidates || [],
  };
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{
  formatted_address: string
  province?: string
  city?: string
  district?: string
  adcode?: string
}> {
  const response = await apiClient.post<{
    success: boolean
    data?: {
      formatted_address: string
      province?: string
      city?: string
      district?: string
      adcode?: string
    }
    error?: string
  }>('/api/ai/regeo', { lat, lng })

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Reverse geocoding failed')
  }

  return response.data
}

/**
 * Upload image to R2
 */
export async function uploadImageToR2(
  file: File
): Promise<{ key: string; url: string }> {
  const response = await apiClient.uploadFile<{ success: boolean; data: { key: string; url: string }; error?: string }>(
    '/api/upload/r2',
    file
  );

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Upload failed');
  }

  return {
    key: response.data.key,
    url: response.data.url,
  };
}

