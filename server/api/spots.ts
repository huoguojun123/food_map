// Spots API endpoints
// Handles CRUD operations for food spots

import { getDatabase } from '../db/connection.js';
import { extractFromText, extractFromImage } from '../services/openai.js';
import { geocode } from '../services/amap.js';

/**
 * Handle POST /api/spots - Create a new food spot
 */
export async function handleCreateSpot(req: Request, url: URL): Promise<Response> {
  try {
    const body = await req.json();

    // Validate required fields
    const validation = validateCreateSpotDto(body);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // If lat/lng not provided, try geocoding
    let lat = body.lat;
    let lng = body.lng;

    if (!lat || !lng) {
      if (body.address_text) {
        try {
          const geocodeResult = await geocode(body.address_text, body.city);
          lat = geocodeResult.location.lat;
          lng = geocodeResult.location.lng;
        } catch (error: unknown) {
          console.error('Geocoding failed:', error);
          // Fall back to default location (e.g., Beijing center)
          lat = 39.9042;
          lng = 116.4074;
        }
      } else {
        return Response.json(
          { error: 'Location information required' },
          { status: 400 }
        );
      }
    }

    // Prepare data for insertion
    const now = new Date().toISOString();
    const tagsJson = body.tags ? JSON.stringify(body.tags) : null;

    const insert = db.prepare(`
      INSERT INTO food_spots (
        name, lat, lng, address_text, city, summary,
        my_notes, tags, rating, price,
        original_share_text, screenshot_r2_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      body.name,
      lat,
      lng,
      body.address_text || null,
      body.city || null,
      body.summary || null,
      body.my_notes || null,
      tagsJson,
      body.rating || null,
      body.price || null,
      body.original_share_text || null,
      body.screenshot_r2_key || null,
      now
    );

    const newSpot = db.prepare('SELECT * FROM food_spots WHERE id = ?').get(result.lastInsertRowid) as FoodSpot;

    console.log(`✅ Created spot #${newSpot.id}: ${newSpot.name}`);

    return Response.json(newSpot, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating spot:', error);
    return Response.json(
      { error: 'Failed to create spot', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/spots - List all spots
 */
export async function handleListSpots(req: Request, url: URL): Promise<Response> {
  try {
    const db = getDatabase();

    const spots = db
      .prepare('SELECT * FROM food_spots ORDER BY created_at DESC')
      .all() as FoodSpot[];

    console.log(`📋 Listing ${spots.length} spots`);

    return Response.json({ spots });
  } catch (error: unknown) {
    console.error('Error listing spots:', error);
    return Response.json(
      { error: 'Failed to list spots' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/spots/:id - Get a specific spot
 */
export async function handleGetSpot(req: Request, url: URL): Promise<Response> {
  try {
    const id = url.pathname.split('/').pop();

    if (!id || isNaN(parseInt(id))) {
      return Response.json({ error: 'Invalid spot ID' }, { status: 400 });
    }

    const db = getDatabase();
    const spot = db.prepare('SELECT * FROM food_spots WHERE id = ?').get(parseInt(id)) as FoodSpot | undefined;

    if (!spot) {
      return Response.json({ error: 'Spot not found' }, { status: 404 });
    }

    return Response.json(spot);
  } catch (error: unknown) {
    console.error('Error getting spot:', error);
    return Response.json(
      { error: 'Failed to get spot' },
      { status: 500 }
    );
  }
}

/**
 * Validate CreateSpotDto
 */
function validateCreateSpotDto(body: unknown): {
  valid: boolean;
  error?: string;
  details?: Array<{ field: string; message: string }>;
} {
  const details: Array<{ field: string; message: string }> = [];

  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid request body' };
  }

  const dto = body as Record<string, unknown>;

  // Required: name
  if (!dto.name || typeof dto.name !== 'string') {
    details.push({ field: 'name', message: 'Name is required and must be a string' });
  } else if (dto.name.trim().length === 0) {
    details.push({ field: 'name', message: 'Name cannot be empty' });
  } else if (dto.name.length > 200) {
    details.push({ field: 'name', message: 'Name must be less than 200 characters' });
  }

  // Required: lat
  if (dto.lat === undefined || typeof dto.lat !== 'number') {
    details.push({ field: 'lat', message: 'Latitude is required and must be a number' });
  } else if (dto.lat < -90 || dto.lat > 90) {
    details.push({ field: 'lat', message: 'Latitude must be between -90 and 90' });
  }

  // Required: lng
  if (dto.lng === undefined || typeof dto.lng !== 'number') {
    details.push({ field: 'lng', message: 'Longitude is required and must be a number' });
  } else if (dto.lng < -180 || dto.lng > 180) {
    details.push({ field: 'lng', message: 'Longitude must be between -180 and 180' });
  }

  // Optional fields validation
  if (dto.rating !== undefined && typeof dto.rating !== 'number') {
    details.push({ field: 'rating', message: 'Rating must be a number' });
  } else if (dto.rating !== undefined && (dto.rating < 0 || dto.rating > 5)) {
    details.push({ field: 'rating', message: 'Rating must be between 0 and 5' });
  }

  if (dto.price !== undefined && typeof dto.price !== 'number') {
    details.push({ field: 'price', message: 'Price must be a number' });
  }

  if (dto.tags !== undefined && !Array.isArray(dto.tags)) {
    details.push({ field: 'tags', message: 'Tags must be an array' });
  }

  if (dto.summary !== undefined && typeof dto.summary !== 'string') {
    details.push({ field: 'summary', message: 'Summary must be a string' });
  } else if (dto.summary !== undefined && dto.summary.length > 100) {
    details.push({ field: 'summary', message: 'Summary must be less than 100 characters' });
  }

  if (details.length > 0) {
    return {
      valid: false,
      error: 'Validation failed',
      details,
    };
  }

  return { valid: true };
}

// Types
type FoodSpot = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address_text?: string;
  city?: string;
  summary?: string;
  my_notes?: string;
  tags?: string;
  rating?: number;
  price?: number;
  original_share_text?: string;
  screenshot_r2_key?: string;
  created_at: string;
};

type CreateSpotDto = {
  name: string;
  lat?: number;
  lng?: number;
  address_text?: string;
  city?: string;
  summary?: string;
  my_notes?: string;
  tags?: string[];
  rating?: number;
  price?: number;
  original_share_text?: string;
  screenshot_r2_key?: string;
};
