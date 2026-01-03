// Geocoding API endpoint
// Converts address text to coordinates using AMap

import { geocode } from '../services/amap.js';

/**
 * Handle POST /api/ai/geocode - Convert address to coordinates
 */
export async function handleGeocode(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    // Validate request body
    if (!body.address || typeof body.address !== 'string') {
      return Response.json(
        { error: 'Address is required and must be a string' },
        { status: 400 }
      );
    }

    const result = await geocode(body.address, body.city);

    return Response.json({
      success: true,
      data: {
        lat: result.location.lat,
        lng: result.location.lng,
        formatted_address: result.formatted_address,
      },
    });
  } catch (error: unknown) {
    console.error('Error in geocode:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Geocoding failed';

    return Response.json(
      {
        success: false,
        data: null,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
