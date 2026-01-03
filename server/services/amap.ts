// AMap (高德地图) Geocoding API service
// Converts address text to latitude/longitude coordinates

const AMAP_KEY = process.env.AMAP_KEY;
const AMAP_GEOCODE_URL = 'https://restapi.amap.com/v3/geocode/geo';

const API_TIMEOUT = 5000; // 5 seconds
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Cache entry with expiration time
 */
interface CacheEntry {
  data: GeocodingResult;
  expiresAt: number;
}

/**
 * In-memory cache for geocoding results
 */
const geocodeCache: Map<string, CacheEntry> = new Map();

/**
 * Clear expired cache entries
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of geocodeCache.entries()) {
    if (entry.expiresAt < now) {
      geocodeCache.delete(key);
    }
  }
}

/**
 * Get from cache if available and not expired
 */
function getFromCache(address: string, city?: string): GeocodingResult | null {
  const cacheKey = city ? `${city}:${address}` : address;
  const entry = geocodeCache.get(cacheKey);

  if (entry && entry.expiresAt > Date.now()) {
    console.log('📦 Using cached geocode result');
    return entry.data;
  }

  return null;
}

/**
 * Store in cache with expiration
 */
function setCache(address: string, city: string | undefined, data: GeocodingResult): void {
  const cacheKey = city ? `${city}:${address}` : address;
  geocodeCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  });

  // Clean up old cache entries periodically
  if (geocodeCache.size > 100) {
    cleanExpiredCache();
  }
}

/**
 * Convert address to coordinates using AMap Geocoding API
 */
export async function geocode(
  address: string,
  city?: string
): Promise<GeocodingResult> {
  if (!AMAP_KEY) {
    throw new Error('AMAP_KEY environment variable is not set');
  }

  // Check cache first
  const cached = getFromCache(address, city);
  if (cached) {
    return cached;
  }

  console.log(`📍 Geocoding: ${address}${city ? ` (${city})` : ''}...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const params = new URLSearchParams({
      key: AMAP_KEY,
      address: address,
    });

    if (city) {
      params.append('city', city);
    }

    const url = `${AMAP_GEOCODE_URL}?${params.toString()}`;

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AMap API error: ${response.status}`);
    }

    const data: AMapResponse = await response.json();

    if (data.status !== '1') {
      throw new Error(`AMap geocoding failed: ${data.info}`);
    }

    if (!data.geocodes || data.geocodes.length === 0) {
      throw new Error('No results found for address');
    }

    const firstResult = data.geocodes[0];
    const result: GeocodingResult = {
      formatted_address: firstResult.formatted_address,
      province: firstResult.addressComponent?.province,
      city: firstResult.addressComponent?.city,
      district: firstResult.addressComponent?.district,
      township: firstResult.addressComponent?.township,
      adcode: firstResult.adcode,
      location: {
        lng: parseFloat(firstResult.location.split(',')[0]),
        lat: parseFloat(firstResult.location.split(',')[1]),
      },
    };

    // Cache the result
    setCache(address, city, result);

    console.log('✅ Geocode successful:', result.location);
    return result;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Geocoding request timeout');
    }

    throw error;
  }
}

export default { geocode };

// Types for API responses
type AMapResponse = {
  status: string;
  info: string;
  infocode: string;
  count: string;
  geocodes: AMapGeocode[];
};

type AMapGeocode = {
  formatted_address: string;
  addressComponent: {
    province?: string;
    city?: string;
    district?: string;
    township?: string;
  };
  adcode: string;
  location: string; // "lng,lat"
};

type GeocodingResult = {
  formatted_address: string;
  province: string;
  city: string;
  district: string;
  township: string;
  adcode: string;
  location: {
    lng: number;
    lat: number;
  };
};
