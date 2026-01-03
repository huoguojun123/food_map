// Database types (SQLite schema)
export interface FoodSpot {
  id: number
  name: string
  lat: number
  lng: number
  address_text?: string
  city?: string
  summary?: string // AI generated <20 chars
  my_notes?: string
  tags?: string // JSON Array string: ["Hot", "Date Night"]
  rating?: number
  price?: number
  original_share_text?: string
  screenshot_r2_key?: string
  created_at: string
}

export interface Collection {
  id: number
  title: string
  spot_ids: string // JSON Array string: "[1, 4, 12]"
  description?: string
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
  summary?: string
  my_notes?: string
  tags?: string[]
  rating?: number
  price?: number
  original_share_text?: string
  screenshot_r2_key?: string
}

export type UpdateSpotDto = Partial<CreateSpotDto>

export interface CreateCollectionDto {
  title: string
  spot_ids: number[]
  description?: string
}

// AI types
export interface AiExtractionResult {
  name: string
  address_text?: string
  price?: number
  rating?: number
  dishes?: string[]
  vibe?: string
  summary: string // <20 chars
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
