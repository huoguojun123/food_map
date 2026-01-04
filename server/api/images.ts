// Image proxy API endpoint
// Streams images from private R2 buckets via signed requests

import { getObject } from '../services/r2.js'

function sanitizeKey(rawKey: string): string | null {
  const trimmed = rawKey.trim().replace(/^\/+/, '')
  if (!trimmed) {
    return null
  }
  if (trimmed.includes('..')) {
    return null
  }
  return trimmed
}

/**
 * Handle GET /api/images/* - Proxy image from R2
 */
export async function handleImageProxy(req: Request, url: URL): Promise<Response> {
  try {
    const raw = url.pathname.split('/api/images/')[1] || ''
    const decoded = decodeURIComponent(raw)
    const key = sanitizeKey(decoded)
    if (!key) {
      return new Response('Invalid image key', { status: 400 })
    }

    const bucket = process.env.R2_BUCKET_NAME || 'gourmetlog-images'
    const normalizedKey = key.startsWith(`${bucket}/`) ? key.slice(bucket.length + 1) : key

    const r2Response = await getObject(normalizedKey)
    if (!r2Response.ok) {
      const text = await r2Response.text()
      return new Response(text || 'Failed to fetch image', { status: r2Response.status })
    }

    const headers = new Headers()
    const contentType = r2Response.headers.get('content-type') || 'application/octet-stream'
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')

    return new Response(r2Response.body, { status: 200, headers })
  } catch (error: unknown) {
    console.error('Error in image proxy:', error)
    return new Response('Image proxy failed', { status: 500 })
  }
}
