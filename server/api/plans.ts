import { d1Execute, d1Query } from '../db/d1.js'

type TripPlan = {
  id: number
  title: string
  summary?: string
  spot_ids?: string
  origin_text?: string
  origin_lat?: number
  origin_lng?: number
  radius_km?: number
  created_at: string
}

export async function handleCreatePlan(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      title?: string
      summary?: string
      spot_ids?: number[]
      origin_text?: string
      origin_lat?: number
      origin_lng?: number
      radius_km?: number
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) {
      return Response.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!Array.isArray(body.spot_ids) || body.spot_ids.length === 0) {
      return Response.json({ error: 'spot_ids must be a non-empty array' }, { status: 400 })
    }

    const spotIds = body.spot_ids.filter(id => Number.isFinite(id))
    if (spotIds.length === 0) {
      return Response.json({ error: 'spot_ids must contain valid ids' }, { status: 400 })
    }

    const summary = typeof body.summary === 'string' ? body.summary.trim() : null
    const originText =
      typeof body.origin_text === 'string' && body.origin_text.trim().length > 0
        ? body.origin_text.trim()
        : null
    const originLat =
      typeof body.origin_lat === 'number' && Number.isFinite(body.origin_lat)
        ? body.origin_lat
        : null
    const originLng =
      typeof body.origin_lng === 'number' && Number.isFinite(body.origin_lng)
        ? body.origin_lng
        : null
    const radiusKm =
      typeof body.radius_km === 'number' && Number.isFinite(body.radius_km)
        ? body.radius_km
        : null

    const now = new Date().toISOString()

    const insertSql = `
      INSERT INTO trip_plans (title, summary, spot_ids, created_at)
      VALUES (?, ?, ?, ?)
    `

    const result = await d1Execute(
      `
      INSERT INTO trip_plans (title, summary, spot_ids, origin_text, origin_lat, origin_lng, radius_km, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [title, summary, JSON.stringify(spotIds), originText, originLat, originLng, radiusKm, now]
    )

    const newId = result.meta.last_row_id
    if (!newId) {
      throw new Error('D1 插入失败，未返回新记录 ID')
    }

    const rows = await d1Query<TripPlan>('SELECT * FROM trip_plans WHERE id = ?', [newId])
    const plan = rows[0]
    return Response.json(plan, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating plan:', error)
    return Response.json(
      { error: 'Failed to create plan', details: String(error) },
      { status: 500 }
    )
  }
}

export async function handleListPlans(): Promise<Response> {
  try {
    const plans = await d1Query<TripPlan>('SELECT * FROM trip_plans ORDER BY created_at DESC')
    return Response.json({ plans })
  } catch (error: unknown) {
    console.error('Error listing plans:', error)
    return Response.json({ error: 'Failed to list plans' }, { status: 500 })
  }
}

export async function handleDeletePlan(req: Request, url: URL): Promise<Response> {
  try {
    const id = url.pathname.split('/').pop()
    if (!id || isNaN(parseInt(id))) {
      return Response.json({ error: 'Invalid plan ID' }, { status: 400 })
    }

    const planId = parseInt(id)
    const existing = await d1Query<{ id: number }>('SELECT id FROM trip_plans WHERE id = ?', [planId])
    if (!existing[0]) {
      return Response.json({ error: 'Plan not found' }, { status: 404 })
    }

    await d1Execute('DELETE FROM trip_plans WHERE id = ?', [planId])
    return new Response(null, { status: 204 })
  } catch (error: unknown) {
    console.error('Error deleting plan:', error)
    return Response.json(
      { error: 'Failed to delete plan', details: String(error) },
      { status: 500 }
    )
  }
}
