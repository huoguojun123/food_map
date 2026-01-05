'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { FoodSpot } from '@/lib/types/index'
import { listSpots } from '@/lib/api/spots'
import { createPlan } from '@/lib/api/plans'
import { generateAiPlan } from '@/lib/api/ai'
import { geocodeAddress, reverseGeocode } from '@/lib/api/spots'

/**
 * AI 规划页面
 * 特性：
 * - 可输入自然语句（如“到开封书店街了”）自动提取地点并定位
 * - 可手动输入位置、匹配候选、获取当前定位
 * - 不勾选餐厅时默认使用“当前位置 + 半径”筛选出的餐厅并按距离排序
 * - 勾选餐厅则仅使用勾选集合
 * - 保存计划时写入 origin_text / origin_lat / origin_lng / radius_km
 */
export default function AiPlannerPage() {
  const [spots, setSpots] = useState<FoodSpot[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [intent, setIntent] = useState('')
  const [planTitle, setPlanTitle] = useState('')
  const [planSummary, setPlanSummary] = useState('')
  const [planOrder, setPlanOrder] = useState<number[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [originText, setOriginText] = useState('')
  const [originCandidates, setOriginCandidates] = useState<
    Array<{ formatted_address: string; lat: number; lng: number; city?: string; district?: string }>
  >([])
  const [originLocation, setOriginLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isMatchingOrigin, setIsMatchingOrigin] = useState(false)
  const [radiusKm, setRadiusKm] = useState('6')

  // 加载餐厅
  useEffect(() => {
    const load = async () => {
      try {
        const data = await listSpots()
        setSpots(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载记录失败')
      }
    }
    load()
  }, [])

  // 自动尝试从需求中提取地点并定位（如果还未定位、且用户未手动输入位置）
  useEffect(() => {
    if (originLocation) return
    if (originText.trim().length > 0) return

    void autoGeocode({
      originText: '',
      intent,
      geocode: geocodeAddress,
      setOriginLocation,
      setOriginText,
      setOriginCandidates,
      setIsMatchingOrigin,
      setError,
      reason: 'intent-change',
    })
  }, [intent]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSpots = useMemo(
    () => spots.filter(spot => selectedIds.includes(spot.id)),
    [spots, selectedIds]
  )

  const filteredSpots = useMemo(() => {
    if (!originLocation) return spots
    const radius = Number(radiusKm)
    const effectiveRadius = Number.isFinite(radius) && radius > 0 ? radius : null
    return spots
      .map(spot => ({
        spot,
        distance: getDistanceKm(originLocation.lat, originLocation.lng, spot.lat, spot.lng),
      }))
      .filter(item => (effectiveRadius ? item.distance <= effectiveRadius : true))
      .sort((a, b) => a.distance - b.distance)
      .map(item => item.spot)
  }, [spots, originLocation, radiusKm])

  const autoSpots = useMemo(() => {
    if (selectedSpots.length > 0) return selectedSpots
    return filteredSpots
  }, [selectedSpots, filteredSpots])

  const orderedSpots = useMemo(() => {
    if (!planOrder || planOrder.length === 0) return autoSpots
    const spotMap = new Map(autoSpots.map(spot => [spot.id, spot]))
    const ordered = planOrder.map(id => spotMap.get(id)).filter(Boolean) as FoodSpot[]
    const missing = autoSpots.filter(spot => !planOrder.includes(spot.id))
    return [...ordered, ...missing]
  }, [autoSpots, planOrder])

  const toggleSpot = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const ensureOrigin = async (): Promise<boolean> => {
    if (originLocation) return true
    return await autoGeocode({
      originText,
      intent,
      geocode: geocodeAddress,
      setOriginLocation,
      setOriginText,
      setOriginCandidates,
      setIsMatchingOrigin,
      setError,
      reason: 'auto-ensure',
    })
  }

  const handleGenerate = async () => {
    const ensured = await ensureOrigin()
    if (!ensured && spots.length === 0) {
      setError('暂无可规划的餐厅记录')
      return
    }
    if (autoSpots.length === 0) {
      setError('暂无可规划的餐厅记录')
      return
    }

    setIsGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const plan = await generateAiPlan({
        intent,
        spots: autoSpots.map(spot => ({
          id: spot.id,
          name: spot.name,
          address_text: spot.address_text,
          taste: spot.taste,
          summary: spot.summary,
          distance_km: originLocation
            ? getDistanceKm(originLocation.lat, originLocation.lng, spot.lat, spot.lng)
            : undefined,
        })),
      })
      setPlanTitle(plan.title || '旅途规划')
      setPlanSummary(plan.summary || '')
      setPlanOrder(plan.order ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 规划失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    const ensured = await ensureOrigin()
    if (!ensured && spots.length === 0) {
      setError('暂无可保存的餐厅记录')
      return
    }
    if (autoSpots.length === 0) {
      setError('暂无可保存的餐厅记录')
      return
    }

    const payloadOrder =
      planOrder && planOrder.length > 0 ? planOrder : autoSpots.map(spot => spot.id)
    const title = planTitle.trim() || '旅途规划'

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await createPlan({
        title,
        summary: planSummary.trim() || undefined,
        spot_ids: payloadOrder,
        origin_text: originText.trim() || undefined,
        origin_lat: originLocation?.lat,
        origin_lng: originLocation?.lng,
        radius_km: Number(radiusKm) || undefined,
      })
      setSuccess('已保存到旅途规划')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const selectionNote =
    selectedSpots.length > 0
      ? `已手动选择 ${selectedSpots.length} 家`
      : originLocation
        ? `未选择时默认使用附近 ${filteredSpots.length} 家`
        : `未选择时默认使用全部 ${spots.length} 家`

  const handleMatchOrigin = async () => {
    setError(null)
    await autoGeocode({
      originText,
      intent,
      geocode: geocodeAddress,
      setOriginLocation,
      setOriginText,
      setOriginCandidates,
      setIsMatchingOrigin,
      setError,
      reason: 'manual',
    })
  }

  const applyOriginCandidate = (candidate: { formatted_address: string; lat: number; lng: number }) => {
    setOriginLocation({ lat: candidate.lat, lng: candidate.lng })
    setOriginText(candidate.formatted_address)
    setOriginCandidates([])
  }

  const handleGeoLocate = () => {
    if (!navigator.geolocation) {
      setError('浏览器不支持定位')
      return
    }
    setIsMatchingOrigin(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        setOriginLocation({ lat: latitude, lng: longitude })
        setOriginCandidates([])

        try {
          const info = await reverseGeocode(latitude, longitude)
          setOriginText(info.formatted_address || '')
        } catch {
          setOriginText('')
        } finally {
          setIsMatchingOrigin(false)
        }
      },
      err => {
        setIsMatchingOrigin(false)
        setError(err.message || '定位失败')
      }
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-display text-zinc-900">AI 规划</h1>
            <p className="text-sm text-zinc-600">生成推荐与路线，保存到旅途规划</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
          >
            返回首页
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="mag-card rounded-[32px] p-6 space-y-4">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-zinc-700">规划需求</label>
            <textarea
              value={intent}
              onChange={e => setIntent(e.target.value)}
              placeholder="例如：到开封书店街了，想找 3km 内适合两人小聚的店"
              rows={3}
              className="mag-input w-full px-5 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white resize-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || autoSpots.length === 0}
                className="px-5 py-2 rounded-full bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:bg-orange-300"
              >
                {isGenerating ? '生成中...' : 'AI 生成计划'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || autoSpots.length === 0}
                className="px-5 py-2 rounded-full border border-orange-200 text-orange-600 text-sm font-semibold hover:bg-orange-50 disabled:opacity-60"
              >
                {isSaving ? '保存中...' : '保存到旅途规划'}
              </button>
            </div>
            <p className="text-xs text-zinc-500">{selectionNote}</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
          </div>
        </div>

        <div className="mag-card rounded-[32px] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">当前位置与范围</h2>
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr_auto] gap-4 items-start">
            <div className="space-y-3">
              <input
                type="text"
                value={originText}
                onChange={e => setOriginText(e.target.value)}
                placeholder="输入当前位置或旅途地点（例如：开封书店街、高新区雪松路）"
                className="mag-input w-full px-5 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleMatchOrigin}
                  disabled={isMatchingOrigin}
                  className="px-4 py-2 rounded-full border border-orange-200 text-orange-600 text-sm hover:bg-orange-50 disabled:opacity-60"
                >
                  {isMatchingOrigin ? '匹配中...' : '匹配位置'}
                </button>
                <button
                  type="button"
                  onClick={handleGeoLocate}
                  className="px-4 py-2 rounded-full border border-orange-200 text-orange-600 text-sm hover:bg-orange-50"
                >
                  获取当前定位
                </button>
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <span>半径</span>
                  <input
                    type="number"
                    min="1"
                    value={radiusKm}
                    onChange={e => setRadiusKm(e.target.value)}
                    className="w-20 px-3 py-2 rounded-xl border border-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                  <span>km</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                可直接输入“到开封书店街了”，我会自动解析位置；留空则使用全部餐厅。
              </p>
            </div>
            {originLocation && (
              <div className="rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-xs text-zinc-600">
                已定位：{originLocation.lat.toFixed(5)}, {originLocation.lng.toFixed(5)}
              </div>
            )}
          </div>
          {originCandidates.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">请选择最准确的位置</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {originCandidates.slice(0, 6).map(candidate => (
                  <button
                    key={`${candidate.formatted_address}-${candidate.lat}`}
                    type="button"
                    onClick={() => applyOriginCandidate(candidate)}
                    className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-left text-xs text-zinc-700 hover:border-orange-200 hover:bg-orange-50"
                  >
                    <div className="font-medium text-zinc-800">{candidate.formatted_address}</div>
                    <div className="mt-1 text-[11px] text-zinc-500">
                      {candidate.city || '未知城市'} · {candidate.district || '未知区域'} · {candidate.lat.toFixed(4)},{' '}
                      {candidate.lng.toFixed(4)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mag-card rounded-[32px] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">推荐计划预览</h2>
          <div className="space-y-2 text-sm">
            <div className="text-zinc-600">标题：{planTitle || '未生成'}</div>
            <div className="text-zinc-600">说明：{planSummary || '未生成'}</div>
          </div>
          <div className="space-y-2">
            {orderedSpots.map((spot, index) => (
              <div
                key={spot.id}
                className="rounded-2xl border border-orange-100 px-4 py-3 text-sm text-zinc-700"
              >
                <div className="font-medium text-zinc-900">
                  {index + 1}. {spot.name}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {spot.taste || '口味未知'} · {spot.summary || '暂无描述'}
                  {originLocation && (
                    <> · 距离约 {getDistanceKm(originLocation.lat, originLocation.lng, spot.lat, spot.lng).toFixed(1)}km</>
                  )}
                </div>
              </div>
            ))}
            {orderedSpots.length === 0 && (
              <p className="text-sm text-zinc-500">先选择餐厅再生成计划。</p>
            )}
          </div>
        </div>

        <div className="mag-card rounded-[32px] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">选择餐厅（可选）</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSpots.map(spot => (
              <label
                key={spot.id}
                className="flex items-start gap-3 rounded-2xl border border-orange-100 p-4 hover:border-orange-200 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(spot.id)}
                  onChange={() => toggleSpot(spot.id)}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <div className="space-y-1">
                  <div className="font-medium text-zinc-900">{spot.name}</div>
                  <div className="text-xs text-zinc-500">{spot.address_text || '未填写地址'}</div>
                  <div className="text-xs text-zinc-600">
                    {spot.taste || '口味未知'} · {spot.summary || '暂无描述'}
                    {originLocation && (
                      <> · 距离约 {getDistanceKm(originLocation.lat, originLocation.lng, spot.lat, spot.lng).toFixed(1)}km</>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function extractLocationHint(intent: string, originText: string): string | null {
  const merged = (originText || intent || '').trim()
  if (!merged) return null
  // 过滤明显的“坐标字符串/当前定位”输入，避免当作关键词去高德匹配
  if (isLikelyCoordinateText(merged)) {
    return null
  }
  const patterns = [
    /到([^，。!.]+?)了/,
    /在([^，。!.]+?)附近/,
    /去([^，。!.]+?)玩/,
    /到([^，。!.]+?)出差/,
    /到([^，。!.]+?)旅游/,
  ]
  for (const p of patterns) {
    const m = merged.match(p)
    if (m && m[1]) return m[1].trim()
  }
  return merged
}

function isLikelyCoordinateText(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('当前定位') || trimmed.startsWith('已定位')) {
    return true
  }
  return Boolean(trimmed.match(/-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+/))
}

async function autoGeocode(opts: {
  originText: string
  intent: string
  geocode: typeof geocodeAddress
  setOriginLocation: (loc: { lat: number; lng: number }) => void
  setOriginText: (value: string) => void
  setOriginCandidates: (value: any[]) => void
  setIsMatchingOrigin: (value: boolean) => void
  setError: (value: string | null) => void
  reason?: string
}): Promise<boolean> {
  const {
    originText,
    intent,
    geocode,
    setOriginLocation,
    setOriginText,
    setOriginCandidates,
    setIsMatchingOrigin,
    setError,
  } = opts
  // 如果输入里已经包含可解析的坐标，直接用坐标，不走高德匹配，避免“当前/坐标”导致跨省
  const coordinate = parseCoordinates(originText) ?? parseCoordinates(intent)
  if (coordinate) {
    setOriginLocation({ lat: coordinate.lat, lng: coordinate.lng })
    setOriginCandidates([])
    setOriginText('')
    return true
  }

  const hint = extractLocationHint(intent, originText)
  if (!hint) return false
  setIsMatchingOrigin(true)
  setError(null)
  setOriginCandidates([])
  try {
    const result = await geocode(hint)
    const candidates = result.candidates || []
    setOriginCandidates(candidates)
    if (candidates.length > 0) {
      const candidate = candidates[0]
      setOriginLocation({ lat: candidate.lat, lng: candidate.lng })
      setOriginText(candidate.formatted_address)
      return true
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : '位置匹配失败')
  } finally {
    setIsMatchingOrigin(false)
  }
  return false
}

function parseCoordinates(value: string): { lat: number; lng: number } | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const match = trimmed.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/)
  if (!match) return null
  const a = Number(match[1])
  const b = Number(match[2])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null

  // 常见写法：lat,lng 或 lng,lat 都可能；根据范围做判断
  const looksLikeLatLng = Math.abs(a) <= 90 && Math.abs(b) <= 180
  const looksLikeLngLat = Math.abs(a) <= 180 && Math.abs(b) <= 90
  if (looksLikeLatLng && !looksLikeLngLat) return { lat: a, lng: b }
  if (looksLikeLngLat && !looksLikeLatLng) return { lat: b, lng: a }
  // 两种都可能时默认按 lat,lng
  return { lat: a, lng: b }
}
