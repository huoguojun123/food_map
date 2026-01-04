// Spots API endpoints
// Handles CRUD operations for food spots

import { d1Execute, d1Query } from '../db/d1.js';
import { geocode } from '../services/amap.js';
import { generateTasteSummary } from '../services/openai.js';

/**
 * Handle POST /api/spots - Create a new food spot
 */
export async function handleCreateSpot(req: Request, url: URL): Promise<Response> {
  try {
    const body = await req.json();
    normalizeScreenshotUrls(body);

    // Validate required fields
    const validation = validateCreateSpotDto(body);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    // If lat/lng not provided, try geocoding
    let lat = body.lat;
    let lng = body.lng;

    const hasLat = typeof lat === 'number' && Number.isFinite(lat);
    const hasLng = typeof lng === 'number' && Number.isFinite(lng);

    if (!hasLat || !hasLng) {
      const addressQuery = typeof body.address_text === 'string' && body.address_text.trim().length > 0
        ? body.address_text.trim()
        : body.name?.trim();

      if (!addressQuery) {
        return Response.json(
          { error: 'Location information required' },
          { status: 400 }
        );
      }

      try {
        const geocodeResult = await geocode(addressQuery, body.city);
        lat = geocodeResult.location.lat;
        lng = geocodeResult.location.lng;

        if (
          geocodeResult.formatted_address &&
          (!body.address_text ||
            geocodeResult.formatted_address.length > body.address_text.length)
        ) {
          body.address_text = geocodeResult.formatted_address;
        }

        if (!body.city && typeof geocodeResult.city === 'string' && geocodeResult.city.trim().length > 0) {
          body.city = geocodeResult.city.trim();
        }
      } catch (error: unknown) {
        console.error('Geocoding failed:', error);
        return Response.json(
          {
            error: 'Geocoding failed. Please provide coordinates manually.',
            details: String(error),
          },
          { status: 422 }
        );
      }
    }

    const summaryInput: SummaryInput = {
      name: normalizeText(body.name) || '',
      address_text: normalizeText(body.address_text),
      city: normalizeText(body.city),
      taste: normalizeText(body.taste),
      summary: normalizeText(body.summary),
      original_share_text: normalizeText(body.original_share_text),
      source_url: normalizeText(body.source_url),
    };

    const existingSummary = normalizeSummary(summaryInput.summary ?? undefined);
    const existingTaste = normalizeTaste(summaryInput.taste ?? undefined);
    const aiResult =
      existingSummary && existingTaste
        ? { summary: existingSummary, taste: existingTaste }
        : await tryGenerateSummary(summaryInput);
    const summaryFallback = summaryInput.summary || summaryInput.taste || summaryInput.name;
    const finalSummary =
      normalizeSummary(aiResult.summary ?? summaryFallback) || summaryInput.name;
    const finalTaste =
      normalizeTaste(summaryInput.taste ?? aiResult.taste ?? '风格未知') || '风格未知';

    body.summary = finalSummary;
    body.taste = finalTaste;

    // Prepare data for insertion
    const now = new Date().toISOString();
    const tagsJson = body.tags ? JSON.stringify(body.tags) : null;
    const screenshotUrls = Array.isArray(body.screenshot_urls)
      ? body.screenshot_urls
      : [];
    const screenshotUrlsJson = screenshotUrls.length > 0 ? JSON.stringify(screenshotUrls) : null;

    const insertSql = `
      INSERT INTO food_spots (
        name, lat, lng, address_text, city, taste, summary,
        my_notes, tags, rating, price,
        original_share_text, source_url, screenshot_r2_key, screenshot_urls, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await d1Execute(insertSql, [
      body.name,
      lat,
      lng,
      body.address_text || null,
      body.city || null,
      body.taste || null,
      body.summary || null,
      body.my_notes || null,
      tagsJson,
      body.rating || null,
      body.price || null,
      body.original_share_text || null,
      body.source_url || null,
      body.screenshot_r2_key || null,
      screenshotUrlsJson,
      now,
    ]);

    const newId = result.meta.last_row_id;
    if (!newId) {
      throw new Error('D1 插入失败，未返回新记录 ID');
    }

    const rows = await d1Query<FoodSpot>('SELECT * FROM food_spots WHERE id = ?', [newId]);
    const newSpot = rows[0];

    console.log(`Created spot #${newSpot.id}: ${newSpot.name}`);

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
    const spots = await d1Query<FoodSpot>('SELECT * FROM food_spots ORDER BY created_at DESC');

    console.log(`Listing ${spots.length} spots`);

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

    const rows = await d1Query<FoodSpot>('SELECT * FROM food_spots WHERE id = ?', [parseInt(id)]);
    const spot = rows[0];

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
 * Handle PUT /api/spots/:id - Update a specific spot
 */
export async function handleUpdateSpot(req: Request, url: URL): Promise<Response> {
  try {
    const id = url.pathname.split('/').pop();

    if (!id || isNaN(parseInt(id))) {
      return Response.json({ error: 'Invalid spot ID' }, { status: 400 });
    }

    const body = await req.json();
    normalizeScreenshotUrls(body);
    const validation = validateUpdateSpotDto(body);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const spotId = parseInt(id);
    const existingRows = await d1Query<FoodSpot>('SELECT * FROM food_spots WHERE id = ?', [spotId]);
    const existing = existingRows[0];
    if (!existing) {
      return Response.json({ error: 'Spot not found' }, { status: 404 });
    }

    const payload = { ...(body as Record<string, unknown>) };

    const hasLat = typeof payload.lat === 'number' && Number.isFinite(payload.lat);
    const hasLng = typeof payload.lng === 'number' && Number.isFinite(payload.lng);
    const nextAddress =
      typeof payload.address_text === 'string' ? payload.address_text.trim() : undefined;
    const nextCity =
      typeof payload.city === 'string' ? payload.city.trim() : undefined;
    const prevAddress = existing.address_text ? existing.address_text.trim() : '';
    const prevCity = existing.city ? existing.city.trim() : '';
    const addressChanged = typeof nextAddress === 'string' && nextAddress !== prevAddress;
    const cityChanged = typeof nextCity === 'string' && nextCity !== prevCity;

    if ((addressChanged || cityChanged) && (!hasLat || !hasLng)) {
      const addressQuery =
        nextAddress && nextAddress.length > 0
          ? nextAddress
          : existing.address_text || existing.name;

      try {
        const geocodeResult = await geocode(addressQuery, nextCity);
        payload.lat = geocodeResult.location.lat;
        payload.lng = geocodeResult.location.lng;

        if (
          geocodeResult.formatted_address &&
          (typeof payload.address_text !== 'string' ||
            geocodeResult.formatted_address.length > payload.address_text.length)
        ) {
          payload.address_text = geocodeResult.formatted_address;
        }

        if (!payload.city && typeof geocodeResult.city === 'string' && geocodeResult.city.trim().length > 0) {
          payload.city = geocodeResult.city.trim();
        }
      } catch (error: unknown) {
        console.error('Geocoding failed:', error);
        return Response.json(
          {
            error: 'Geocoding failed. Please provide coordinates manually.',
            details: String(error),
          },
          { status: 422 }
        );
      }
    }

    const summaryInput: SummaryInput = {
      name: normalizeText(payload.name) || existing.name,
      address_text: normalizeText(payload.address_text) ?? existing.address_text,
      city: normalizeText(payload.city) ?? existing.city,
      taste: normalizeText(payload.taste) ?? existing.taste,
      summary: normalizeText(payload.summary) ?? existing.summary,
      original_share_text: normalizeText(payload.original_share_text) ?? existing.original_share_text,
      source_url: normalizeText(payload.source_url) ?? existing.source_url,
    };

    const aiResult = await tryGenerateSummary(summaryInput);
    const summaryFallback = summaryInput.summary || summaryInput.taste || summaryInput.name;
    const finalSummary =
      normalizeSummary(aiResult.summary ?? summaryFallback) || summaryInput.name;
    const finalTaste =
      normalizeTaste(summaryInput.taste ?? aiResult.taste ?? '风格未知') || '风格未知';

    payload.summary = finalSummary;
    payload.taste = finalTaste;

    const updates = buildUpdateFields(payload);
    if (updates.keys.length === 0) {
      return Response.json(existing);
    }

    const updateSql = `UPDATE food_spots SET ${updates.keys.join(', ')} WHERE id = ?`;
    await d1Execute(updateSql, [...updates.values, spotId]);

    const updatedRows = await d1Query<FoodSpot>('SELECT * FROM food_spots WHERE id = ?', [spotId]);
    const updated = updatedRows[0];
    return Response.json(updated);
  } catch (error: unknown) {
    console.error('Error updating spot:', error);
    return Response.json(
      { error: 'Failed to update spot', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE /api/spots/:id - Delete a specific spot
 */
export async function handleDeleteSpot(req: Request, url: URL): Promise<Response> {
  try {
    const id = url.pathname.split('/').pop();

    if (!id || isNaN(parseInt(id))) {
      return Response.json({ error: 'Invalid spot ID' }, { status: 400 });
    }

    const spotId = parseInt(id);
    const existingRows = await d1Query<{ id: number }>('SELECT id FROM food_spots WHERE id = ?', [spotId]);
    const existing = existingRows[0];
    if (!existing) {
      return Response.json({ error: 'Spot not found' }, { status: 404 });
    }

    await d1Execute('DELETE FROM food_spots WHERE id = ?', [spotId]);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    console.error('Error deleting spot:', error);
    return Response.json(
      { error: 'Failed to delete spot', details: String(error) },
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

  const hasLat = typeof dto.lat === 'number' && Number.isFinite(dto.lat);
  const hasLng = typeof dto.lng === 'number' && Number.isFinite(dto.lng);

  if (hasLat !== hasLng) {
    details.push({ field: 'lat', message: 'Latitude and longitude must be provided together' });
    details.push({ field: 'lng', message: 'Latitude and longitude must be provided together' });
  }

  if (hasLat) {
    const lat = dto.lat as number;
    if (lat < -90 || lat > 90) {
      details.push({ field: 'lat', message: 'Latitude must be between -90 and 90' });
    }
  }

  if (hasLng) {
    const lng = dto.lng as number;
    if (lng < -180 || lng > 180) {
      details.push({ field: 'lng', message: 'Longitude must be between -180 and 180' });
    }
  }

  if (!hasLat && !hasLng) {
    if (dto.address_text !== undefined && typeof dto.address_text !== 'string') {
      details.push({ field: 'address_text', message: 'Address must be a string' });
    }
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

  if (dto.taste !== undefined && typeof dto.taste !== 'string') {
    details.push({ field: 'taste', message: 'Taste must be a string' });
  }

  if (dto.screenshot_urls !== undefined) {
    if (!Array.isArray(dto.screenshot_urls)) {
      details.push({ field: 'screenshot_urls', message: 'screenshot_urls must be an array' });
    } else if (dto.screenshot_urls.some(url => typeof url !== 'string')) {
      details.push({ field: 'screenshot_urls', message: 'screenshot_urls must be an array of strings' });
    }
  }

  if (dto.source_url !== undefined && typeof dto.source_url !== 'string') {
    details.push({ field: 'source_url', message: 'source_url must be a string' });
  }

  if (dto.summary !== undefined && typeof dto.summary !== 'string') {
    details.push({ field: 'summary', message: 'Summary must be a string' });
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

function validateUpdateSpotDto(body: unknown): {
  valid: boolean;
  error?: string;
  details?: Array<{ field: string; message: string }>;
} {
  const details: Array<{ field: string; message: string }> = [];

  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid request body' };
  }

  const dto = body as Record<string, unknown>;

  const hasLat = typeof dto.lat === 'number' && Number.isFinite(dto.lat);
  const hasLng = typeof dto.lng === 'number' && Number.isFinite(dto.lng);

  if (hasLat !== hasLng) {
    details.push({ field: 'lat', message: 'Latitude and longitude must be provided together' });
    details.push({ field: 'lng', message: 'Latitude and longitude must be provided together' });
  }

  if (hasLat) {
    const lat = dto.lat as number;
    if (lat < -90 || lat > 90) {
      details.push({ field: 'lat', message: 'Latitude must be between -90 and 90' });
    }
  }

  if (hasLng) {
    const lng = dto.lng as number;
    if (lng < -180 || lng > 180) {
      details.push({ field: 'lng', message: 'Longitude must be between -180 and 180' });
    }
  }

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

  if (dto.taste !== undefined && typeof dto.taste !== 'string') {
    details.push({ field: 'taste', message: 'Taste must be a string' });
  }

  if (dto.screenshot_urls !== undefined) {
    if (!Array.isArray(dto.screenshot_urls)) {
      details.push({ field: 'screenshot_urls', message: 'screenshot_urls must be an array' });
    } else if (dto.screenshot_urls.some(url => typeof url !== 'string')) {
      details.push({ field: 'screenshot_urls', message: 'screenshot_urls must be an array of strings' });
    }
  }

  if (dto.source_url !== undefined && typeof dto.source_url !== 'string') {
    details.push({ field: 'source_url', message: 'source_url must be a string' });
  }

  if (dto.summary !== undefined && typeof dto.summary !== 'string') {
    details.push({ field: 'summary', message: 'Summary must be a string' });
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

function buildUpdateFields(body: Record<string, unknown>): {
  keys: string[];
  values: Array<string | number | null>;
} {
  const keys: string[] = [];
  const values: Array<string | number | null> = [];

  const assign = (field: string, value: unknown) => {
    if (value !== undefined) {
      keys.push(`${field} = ?`);
      values.push(value === null ? null : (value as string | number));
    }
  };

  assign('name', body.name);
  assign('lat', body.lat);
  assign('lng', body.lng);
  assign('address_text', body.address_text ?? null);
  assign('city', body.city ?? null);
  assign('taste', body.taste ?? null);
  assign('summary', body.summary ?? null);
  assign('my_notes', body.my_notes ?? null);
  assign('tags', body.tags ? JSON.stringify(body.tags) : null);
  assign('rating', body.rating ?? null);
  assign('price', body.price ?? null);
  assign('original_share_text', body.original_share_text ?? null);
  assign('source_url', body.source_url ?? null);
  assign('screenshot_r2_key', body.screenshot_r2_key ?? null);
  assign('screenshot_urls', body.screenshot_urls ? JSON.stringify(body.screenshot_urls) : null);

  return { keys, values };
}

function normalizeScreenshotUrls(body: Record<string, unknown>): void {
  if (typeof body.screenshot_urls === 'string') {
    const raw = body.screenshot_urls.trim();
    if (!raw) {
      body.screenshot_urls = [];
      return;
    }

    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          body.screenshot_urls = parsed;
          return;
        }
      } catch {
        // fall through
      }
    }

    body.screenshot_urls = [raw];
  }
}

type SummaryInput = {
  name: string;
  address_text?: string;
  city?: string;
  taste?: string;
  summary?: string;
  original_share_text?: string;
  source_url?: string;
};

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSummary(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > 20 ? trimmed.slice(0, 20) : trimmed;
}

function normalizeTaste(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > 32 ? trimmed.slice(0, 32) : trimmed;
}

async function tryGenerateSummary(input: SummaryInput): Promise<{
  taste?: string;
  summary?: string;
}> {
  try {
    return await generateTasteSummary(input);
  } catch (error: unknown) {
    console.warn('AI summary failed:', error);
    return {};
  }
}

// Types
type FoodSpot = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address_text?: string;
  city?: string;
  taste?: string;
  summary?: string;
  my_notes?: string;
  tags?: string;
  rating?: number;
  price?: number;
  original_share_text?: string;
  source_url?: string;
  screenshot_r2_key?: string;
  screenshot_urls?: string;
  created_at: string;
};

type CreateSpotDto = {
  name: string;
  lat?: number;
  lng?: number;
  address_text?: string;
  city?: string;
  taste?: string;
  summary?: string;
  my_notes?: string;
  tags?: string[];
  rating?: number;
  price?: number;
  original_share_text?: string;
  source_url?: string;
  screenshot_r2_key?: string;
  screenshot_urls?: string[];
};
