// AMap (Gaode) Geocoding API service
// Converts address text to latitude/longitude coordinates

const AMAP_KEY = process.env.AMAP_KEY
const AMAP_GEOCODE_URL = 'https://restapi.amap.com/v3/geocode/geo'
const AMAP_PLACE_URL = 'https://restapi.amap.com/v3/place/text'
const AMAP_INPUT_TIPS_URL = 'https://restapi.amap.com/v3/assistant/inputtips'
const AMAP_REVERSE_GEOCODE_URL = 'https://restapi.amap.com/v3/geocode/regeo'

const API_TIMEOUT = 5000
const CACHE_TTL = 24 * 60 * 60 * 1000

interface CacheEntry {
  data: GeocodingResult[]
  expiresAt: number
}

const geocodeCache: Map<string, CacheEntry> = new Map()

function cleanExpiredCache(): void {
  const now = Date.now()
  for (const [key, entry] of geocodeCache.entries()) {
    if (entry.expiresAt < now) {
      geocodeCache.delete(key)
    }
  }
}

function getFromCache(address: string, city?: string): GeocodingResult[] | null {
  const cacheKey = city ? `${city}:${address}` : address
  const entry = geocodeCache.get(cacheKey)

  if (entry && entry.expiresAt > Date.now()) {
    console.log('Using cached geocode result')
    return entry.data
  }

  return null
}

function setCache(address: string, city: string | undefined, data: GeocodingResult[]): void {
  const cacheKey = city ? `${city}:${address}` : address
  geocodeCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  })

  if (geocodeCache.size > 100) {
    cleanExpiredCache()
  }
}

export async function geocode(address: string, city?: string): Promise<GeocodingResult> {
  const candidates = await geocodeCandidates(address, city)
  const firstResult = candidates[0]
  if (!firstResult) {
    throw new Error('No results found for address')
  }
  return firstResult
}

export async function geocodeCandidates(address: string, city?: string): Promise<GeocodingResult[]> {
  if (!AMAP_KEY) {
    throw new Error('AMAP_KEY environment variable is not set')
  }

  const cached = getFromCache(address, city)
  if (cached) {
    return cached
  }

  console.log(`Geocoding: ${address}${city ? ` (${city})` : ''}...`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const params = new URLSearchParams({
      key: AMAP_KEY,
      address: address,
    })

    if (city) {
      params.append('city', city)
    }

    const url = `${AMAP_GEOCODE_URL}?${params.toString()}`

    const response = await fetch(url, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`AMap API error: ${response.status}`)
    }

    const data: AMapResponse = await response.json()

    if (data.status !== '1') {
      console.warn(`AMap geocoding failed: ${data.info}`)
      return []
    }

    if (!data.geocodes || data.geocodes.length === 0) {
      return []
    }

    const results: GeocodingResult[] = data.geocodes.map(geocode => ({
      formatted_address: geocode.formatted_address,
      province: geocode.addressComponent?.province,
      city: geocode.addressComponent?.city,
      district: geocode.addressComponent?.district,
      township: geocode.addressComponent?.township,
      adcode: geocode.adcode,
      location: {
        lng: parseFloat(geocode.location.split(',')[0]),
        lat: parseFloat(geocode.location.split(',')[1]),
      },
    }))

    let merged = results

    if (results.length <= 1) {
      const placeResults = await searchPlaceCandidates(address, city)
      const tipResults = await searchInputTips(address, city)
      merged = mergeCandidates(results, [...placeResults, ...tipResults], city)
    } else {
      merged = mergeCandidates(results, [], city)
    }

    setCache(address, city, merged)

    console.log('Geocode candidates:', merged.length)
    return merged
  } catch (error: unknown) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Geocoding request timeout')
    }

    // 返回空列表，避免直接中断流程
    console.warn('AMap geocoding error:', error)
    return []
  }
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
  if (!AMAP_KEY) {
    throw new Error('AMAP_KEY environment variable is not set')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const params = new URLSearchParams({
      key: AMAP_KEY,
      location: `${lng},${lat}`,
      radius: '1000',
      extensions: 'base',
      roadlevel: '0',
    })

    const url = `${AMAP_REVERSE_GEOCODE_URL}?${params.toString()}`
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`AMap API error: ${response.status}`)
    }

    const data = (await response.json()) as AMapReverseResponse
    if (data.status !== '1' || !data.regeocode) {
      throw new Error(`AMap reverse geocoding failed: ${data.info}`)
    }

    const component = data.regeocode.addressComponent
    return {
      formatted_address: data.regeocode.formatted_address || '未知位置',
      province: component?.province,
      city: component?.city,
      district: component?.district,
      adcode: component?.adcode,
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Reverse geocoding request timeout')
    }
    throw error
  }
}

export default { geocode, geocodeCandidates, reverseGeocode }

async function searchPlaceCandidates(query: string, city?: string): Promise<GeocodingResult[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const params = new URLSearchParams({
      key: AMAP_KEY || '',
      keywords: query,
      offset: '6',
      extensions: 'base',
    })

    if (city) {
      params.append('city', city)
      params.append('citylimit', 'true')
    }

    const url = `${AMAP_PLACE_URL}?${params.toString()}`
    const response = await fetch(url, { signal: controller.signal })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as AMapPlaceResponse
    if (data.status !== '1' || !Array.isArray(data.pois)) {
      return []
    }

    return data.pois
      .filter(poi => typeof poi.location === 'string' && poi.location.includes(','))
      .map(poi => ({
        formatted_address: buildPlaceAddress(poi),
        province: poi.pname,
        city: poi.cityname,
        district: poi.adname,
        township: undefined,
        adcode: poi.adcode,
        location: {
          lng: parseFloat(poi.location.split(',')[0]),
          lat: parseFloat(poi.location.split(',')[1]),
        },
      }))
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    return []
  }
}

function buildPlaceAddress(poi: AMapPlacePoi): string {
  const name = poi.name ? poi.name.trim() : ''
  const address = poi.address ? poi.address.trim() : ''
  if (name && address) {
    return `${name} ${address}`
  }
  return name || address || '未知地址'
}

function mergeCandidates(
  primary: GeocodingResult[],
  fallback: GeocodingResult[],
  city?: string
): GeocodingResult[] {
  if (fallback.length === 0) {
    return primary
  }

  const seen = new Set(primary.map(item => `${item.formatted_address}-${item.adcode || ''}`))
  const merged = [...primary]

  for (const item of fallback) {
    const key = `${item.formatted_address}-${item.adcode || ''}`
    if (!seen.has(key)) {
      merged.push(item)
      seen.add(key)
    }
  }

  return merged
    .sort((a, b) => {
      let scoreA = 0
      let scoreB = 0
      // 优先匹配城市
      if (a.city && city && a.city.includes(city)) scoreA += 3
      if (b.city && city && b.city.includes(city)) scoreB += 3
      // 再看区县
      if (a.district && city && a.district.includes(city)) scoreA += 2
      if (b.district && city && b.district.includes(city)) scoreB += 2
      // 名称匹配
      if (city && a.formatted_address.includes(city)) scoreA += 1
      if (city && b.formatted_address.includes(city)) scoreB += 1
      return scoreB - scoreA
    })
}

async function searchInputTips(keyword: string, city?: string): Promise<GeocodingResult[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)
  try {
    const params = new URLSearchParams({
      key: AMAP_KEY || '',
      keywords: keyword,
      datatype: 'all',
      citylimit: city ? 'true' : 'false',
    })

    if (city) {
      params.append('city', city)
    }

    const url = `${AMAP_INPUT_TIPS_URL}?${params.toString()}`
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as AMapInputTipsResponse
    if (data.status !== '1' || !Array.isArray(data.tips)) {
      return []
    }

    return data.tips
      .filter(tip => typeof tip.location === 'string' && tip.location.includes(','))
      .map(tip => ({
        formatted_address: tip.name || tip.district || keyword,
        province: tip.district || undefined,
        city: tip.district || undefined,
        district: tip.district || undefined,
        township: undefined,
        adcode: tip.adcode,
        location: {
          lng: parseFloat(tip.location.split(',')[0]),
          lat: parseFloat(tip.location.split(',')[1]),
        },
      }))
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    return []
  }
}

type AMapResponse = {
  status: string
  info: string
  infocode: string
  count: string
  geocodes: AMapGeocode[]
}

type AMapGeocode = {
  formatted_address: string
  addressComponent: {
    province?: string
    city?: string
    district?: string
    township?: string
  }
  adcode: string
  location: string
}

type AMapPlaceResponse = {
  status: string
  info: string
  pois?: AMapPlacePoi[]
}

type AMapPlacePoi = {
  name?: string
  address?: string
  location: string
  pname?: string
  cityname?: string
  adname?: string
  adcode?: string
}

type AMapInputTip = {
  name?: string
  district?: string
  adcode?: string
  location: string
}

type AMapInputTipsResponse = {
  status: string
  info: string
  tips?: AMapInputTip[]
}

type AMapReverseResponse = {
  status: string
  info: string
  regeocode?: {
    formatted_address?: string
    addressComponent?: {
      province?: string
      city?: string
      district?: string
      adcode?: string
    }
  }
}

type GeocodingResult = {
  formatted_address: string
  province?: string
  city?: string
  district?: string
  township?: string
  adcode?: string
  location: {
    lng: number
    lat: number
  }
}
