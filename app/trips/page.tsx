'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { FoodSpot, TripPlan } from '@/lib/types/index'
import { listSpots } from '@/lib/api/spots'
import { deletePlan, listPlans } from '@/lib/api/plans'

export default function TripsPage() {
  const [plans, setPlans] = useState<TripPlan[]>([])
  const [spots, setSpots] = useState<FoodSpot[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [planData, spotData] = await Promise.all([listPlans(), listSpots()])
        setPlans(planData)
        setSpots(spotData)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败')
      }
    }
    load()
  }, [])

  const spotMap = useMemo(() => {
    return new Map(spots.map(spot => [spot.id, spot]))
  }, [spots])

  const parseSpotIds = (value: string | undefined): number[] => {
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter(id => Number.isFinite(id))
      }
    } catch {
      // ignore
    }
    return []
  }

  const handleDelete = async (plan: TripPlan) => {
    if (!confirm(`确定删除「${plan.title}」吗？`)) {
      return
    }
    await deletePlan(plan.id)
    setPlans(prev => prev.filter(item => item.id !== plan.id))
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-display text-zinc-900">旅途规划</h1>
            <p className="text-sm text-zinc-600">查看与管理保存的路线计划</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
          >
            返回首页
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {error && (
          <div className="mag-card rounded-[24px] p-6 text-sm text-red-600">
            {error}
          </div>
        )}

        {plans.length === 0 ? (
          <div className="mag-card rounded-[32px] p-8 text-center text-sm text-zinc-600">
            暂无旅途规划，去 AI 规划页生成吧。
          </div>
        ) : (
          plans.map(plan => {
            const spotIds = parseSpotIds(plan.spot_ids)
            const planSpots = spotIds
              .map(id => spotMap.get(id))
              .filter((spot): spot is FoodSpot => Boolean(spot))
            return (
              <div key={plan.id} className="mag-card rounded-[32px] p-6 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">{plan.title}</h2>
                    <p className="text-sm text-zinc-600">{plan.summary || '暂无说明'}</p>
                    {(plan.origin_text || plan.origin_lat) && (
                      <p className="text-xs text-zinc-500 mt-1">
                        位置：{plan.origin_text || '坐标'}{' '}
                        {plan.origin_lat && plan.origin_lng
                          ? `(${plan.origin_lat.toFixed(4)}, ${plan.origin_lng.toFixed(4)})`
                          : ''}
                        {plan.radius_km ? ` · 半径 ${plan.radius_km} km` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(plan)}
                    className="px-4 py-2 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    删除
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {planSpots.map((spot, index) => (
                    <div
                      key={spot.id}
                      className="rounded-2xl border border-orange-100 px-4 py-3 text-sm text-zinc-700"
                    >
                      <div className="font-medium text-zinc-900">
                        {index + 1}. {spot.name}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {spot.address_text || '未填写地址'}
                      </div>
                    </div>
                  ))}
                  {planSpots.length === 0 && (
                    <div className="text-sm text-zinc-500">计划内暂无餐厅记录。</div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
