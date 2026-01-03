// Spots API client functions
// Provides type-safe API calls for restaurant operations

import { apiClient } from './client';
import type { FoodSpot, CreateSpotDto, AiExtractionResult } from '../types/index';

/**
 * Extract restaurant info from image or text using AI
 */
export async function extractSpotInfo(
  input: { type: 'image' | 'text'; image?: string; text?: string }
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
 * Geocode address to coordinates
 */
export async function geocodeAddress(
  address: string,
  city?: string
): Promise<{ lat: number; lng: number }> {
  const response = await apiClient.post<{
    success: boolean;
    data: { lat: number; lng: number; formatted_address: string };
    error?: string;
  }>('/api/ai/geocode', { address, city });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Geocoding failed');
  }

  return {
    lat: response.data.lat,
    lng: response.data.lng,
  };
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

export default {
  extractSpotInfo,
  createSpot,
  listSpots,
  getSpot,
  geocodeAddress,
  uploadImageToR2,
};
