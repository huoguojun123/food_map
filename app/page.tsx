'use client'

import React, { useEffect, useState } from 'react'
import type { CreateSpotDto, FoodSpot } from '@/lib/types/index'
import { createSpot, listSpots } from '@/lib/api/spots'
import Omnibar from '@/components/layout/omnibar'
import { Clock, MapPin, Sparkles, Star } from 'lucide-react'

export default function HomePage() {
  const [spots, setSpots] = useState<FoodSpot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showActions, setShowActions] = useState(false)

  useEffect(() => {
    loadSpots()
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Service Worker registration failed:', err)
      })
    }
  }, [])

  const loadSpots = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await listSpots()
      setSpots(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSpotCreate = async (data: CreateSpotDto) => {
    try {
      const newSpot = await createSpot(data)
      setSpots(prev => [newSpot, ...prev])
    } catch (err) {
      throw err
    }
  }

  const getTagList = (tags?: string): string[] => {
    if (!tags) {
      return []
    }

    try {
      const parsed = JSON.parse(tags)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const getImageUrls = (spot: FoodSpot): string[] => {
    const urls: string[] = []

    if (spot.screenshot_urls) {
      try {
        const parsed = JSON.parse(spot.screenshot_urls)
        if (Array.isArray(parsed)) {
          urls.push(...parsed.filter(url => typeof url === 'string'))
        }
      } catch {
        // ignore invalid json
      }
    }

    if (spot.screenshot_r2_key && spot.screenshot_r2_key.startsWith('http')) {
      urls.push(spot.screenshot_r2_key)
    }

    return urls
  }

  return (
    <div className="min-h-screen page-shell">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold font-display text-orange-600 leading-tight">
                  GourmetLog
                </h1>
                <p className="text-xs sm:text-sm text-zinc-600">
                  私人美食外脑 · 轻柔留白 · 杂志式卡片
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="mag-chip px-4 py-2 rounded-full text-zinc-600">
                {spots.length} 个记录
              </span>
              <div className="hidden md:flex items-center gap-2">
                <a
                  href="/ai-planner"
                  className="px-4 py-2 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  AI 规划
                </a>
                <a
                  href="/trips"
                  className="px-4 py-2 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  旅途规划
                </a>
                <a
                  href="/settings"
                  className="px-4 py-2 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  设置
                </a>
              </div>
              <button
                type="button"
                onClick={() => setShowActions(true)}
                className="md:hidden px-4 py-2 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
              >
                菜单
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 transition-opacity md:hidden ${
          showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/20"
          onClick={() => setShowActions(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-64 bg-white shadow-2xl border-l border-orange-100 transition-transform ${
            showActions ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-5 flex items-center justify-between border-b border-orange-100">
            <span className="font-medium text-zinc-800">操作</span>
            <button
              type="button"
              onClick={() => setShowActions(false)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              关闭
            </button>
          </div>
          <div className="p-5 flex flex-col gap-3 text-sm">
            <a
              href="/ai-planner"
              className="px-4 py-3 rounded-2xl border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
            >
              AI 规划
            </a>
            <a
              href="/trips"
              className="px-4 py-3 rounded-2xl border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
            >
              旅途规划
            </a>
            <a
              href="/settings"
              className="px-4 py-3 rounded-2xl border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
            >
              设置
            </a>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="relative">
              <div className="animate-spin h-12 w-12 border-4 border-orange-200 border-t-orange-500 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-orange-500 animate-pulse" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="mag-card rounded-[32px] p-10 text-center">
            <p className="text-orange-700 font-medium">{error}</p>
          </div>
        ) : spots.length === 0 ? (
          <div className="text-center py-24">
            <div className="mag-card rounded-[40px] p-10 max-w-2xl mx-auto">
              <div className="bg-orange-100 rounded-full w-28 h-28 mx-auto mb-6 flex items-center justify-center">
                <Sparkles className="h-14 w-14 text-orange-600" />
              </div>
              <h2 className="text-3xl font-display text-zinc-900 mb-3">
                开始记录你的美食之旅
              </h2>
              <p className="text-zinc-600 mb-6">
                添加截图、链接或文字，让 AI 帮你整理成柔和的美食档案。
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-500">
                <span className="mag-chip px-4 py-2 rounded-full">多图上传</span>
                <span className="mag-chip px-4 py-2 rounded-full">链接识别</span>
                <span className="mag-chip px-4 py-2 rounded-full">AI 自动总结</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-zinc-800 font-display">
                最近记录
              </h3>
              <div className="flex-1 h-px bg-gradient-to-r from-orange-200 to-transparent" />
            </div>

            {spots.map((spot, index) => {
              const images = getImageUrls(spot)

              return (
                <div
                  key={spot.id}
                  className="mag-card rounded-[32px] p-6 md:p-8 space-y-6"
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${index * 0.08}s both`,
                  }}
                >
                  <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
                    {images.length > 0 ? (
                      <div className="space-y-3">
                        <div className="overflow-hidden rounded-2xl border border-orange-100 image-frame">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={images[0]}
                            alt={spot.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        {images.length > 1 && (
                          <div className="grid grid-cols-2 gap-3">
                            {images.slice(1, 3).map((url, idx) => (
                              <div key={`${url}-${idx}`} className="overflow-hidden rounded-2xl border border-orange-100 image-frame-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`${spot.name}-${idx}`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mag-chip rounded-2xl p-6 text-sm text-zinc-500">
                        暂无图片，添加截图可丰富记录
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-display text-zinc-900 mb-2">
                            {spot.name}
                          </h3>
                          {spot.city && (
                            <span className="text-sm text-zinc-500 inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {spot.city}
                            </span>
                          )}
                        </div>
                        {spot.rating !== undefined && spot.rating !== null && (
                          <div className="mag-chip px-4 py-2 rounded-full flex items-center gap-1.5 text-orange-600">
                            <Star className="h-4 w-4 fill-orange-500" />
                            <span className="font-semibold">{spot.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      {spot.summary && (
                        <div className="bg-orange-50/70 rounded-2xl px-4 py-3">
                          <p className="text-sm text-orange-800">{spot.summary}</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        {spot.address_text && (
                          <div className="flex items-start gap-2 text-sm text-zinc-600">
                            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-orange-300" />
                            <span className="break-words">{spot.address_text}</span>
                          </div>
                        )}

                        {spot.price !== undefined && spot.price !== null && (
                          <div className="flex items-center gap-2 text-sm text-zinc-600">
                            <span className="text-orange-500 font-semibold">¥</span>
                            <span className="font-semibold text-zinc-900 text-lg">
                              {spot.price}
                            </span>
                            <span className="text-zinc-500">/人均</span>
                          </div>
                        )}

                        {spot.tags && (
                          <div className="flex flex-wrap gap-2">
                            {getTagList(spot.tags).map((tag: string, idx: number) => (
                              <span
                                key={idx}
                                className="mag-chip px-3 py-1.5 text-xs text-zinc-600 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {spot.my_notes && (
                          <div className="mt-2 pt-4 border-t border-orange-100">
                            <p className="text-sm text-zinc-600">
                              <span className="font-medium text-orange-600">💬 笔记：</span>
                              {spot.my_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-orange-100 text-xs text-zinc-500">
                    <Clock className="h-3.5 w-3.5 text-orange-300" />
                    <span>
                      {new Date(spot.created_at).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Omnibar onSpotCreate={handleSpotCreate} />
    </div>
  )
}
