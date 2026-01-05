// Database types (SQLite schema)
export interface FoodSpot {
  id: number
  name: string
  lat: number
  lng: number
  address_text?: string
  city?: string
  taste?: string
  summary?: string // AI generated <24 chars
  my_notes?: string
  tags?: string // JSON Array string: ["Hot", "Date Night"]
  rating?: number
  price?: number
  original_share_text?: string
  screenshot_r2_key?: string
  screenshot_urls?: string // JSON Array string: ["https://..."]
  source_url?: string
  created_at: string
}

export interface Collection {
  id: number
  title: string
  spot_ids: string // JSON Array string: "[1, 4, 12]"
  description?: string
  created_at: string
}

export interface TripPlan {
  id: number
  title: string
  summary?: string
  spot_ids: string // JSON Array string: "[1, 4, 12]"
  origin_text?: string
  origin_lat?: number
  origin_lng?: number
  radius_km?: number
  created_at: string
}

export interface SystemConfig {
  key: string
  value: string
}

// API types
export interface CreateSpotDto {
  name: string
  lat?: number
  lng?: number
  address_text?: string
  city?: string
  taste?: string
  summary?: string
  my_notes?: string
  tags?: string[]
  rating?: number
  price?: number
  original_share_text?: string
  screenshot_r2_key?: string
  screenshot_urls?: string[]
  source_url?: string
}

export type UpdateSpotDto = Partial<CreateSpotDto>

export interface CreateCollectionDto {
  title: string
  spot_ids: number[]
  description?: string
}

export interface CreateTripPlanDto {
  title: string
  summary?: string
  spot_ids: number[]
  origin_text?: string
  origin_lat?: number
  origin_lng?: number
  radius_km?: number
}

// AI types
export interface AiExtractionResult {
  name: string
  address_text?: string
  price?: number
  rating?: number
  dishes?: string[]
  vibe?: string
  taste?: string
  summary: string // <24 chars
}

export interface AiRecommendationRequest {
  userLocation: {
    lat: number
    lng: number
  }
  query: string
  nearbySpots: FoodSpot[]
}

export interface AiRecommendationResult {
  recommendations: {
    spot: FoodSpot
    reason: string
  }[]
}

// Geo types
export interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export interface GeoLocation {
  lat: number
  lng: number
}
