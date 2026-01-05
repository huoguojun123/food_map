'use client'

import React, { useEffect, useState } from 'react'
import type { CreateSpotDto, FoodSpot } from '@/lib/types/index'
import { deleteSpot, listSpots, updateSpot } from '@/lib/api/spots'
import SpotForm from '@/components/forms/spot-form'
import { Clock, Sparkles } from 'lucide-react'

export default function HomePage() {
  const [spots, setSpots] = useState<FoodSpot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showActions, setShowActions] = useState(false)
  const [editingSpot, setEditingSpot] = useState<FoodSpot | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

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

  const handleSpotUpdate = async (data: CreateSpotDto) => {
    if (!editingSpot) {
      return
    }
    const updated = await updateSpot(editingSpot.id, data)
    setSpots(prev => prev.map(spot => (spot.id === updated.id ? updated : spot)))
    setEditingSpot(null)
  }

  const handleDeleteSpot = async (spot: FoodSpot) => {
    if (!confirm(`确定删除「${spot.name}」吗？此操作不可撤销。`)) {
      return
    }
    await deleteSpot(spot.id)
    await loadSpots()
  }

  const buildEditPayload = (spot: FoodSpot): CreateSpotDto => {
    return {
      name: spot.name,
      lat: spot.lat,
      lng: spot.lng,
      address_text: spot.address_text,
      taste: spot.taste,
      summary: spot.summary,
      screenshot_urls: extractStoredImages(spot),
    }
  }

  const formatCoord = (value?: number): string => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '-'
    }
    return value.toFixed(5)
  }

  const formatText = (value?: string): string => {
    const trimmed = value?.trim()
    return trimmed && trimmed.length > 0 ? trimmed : '-'
  }

  const isImageUrl = (value: string): boolean => {
    return value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')
  }

  const buildProxyImageUrl = (key: string): string => {
    const configured = process.env.NEXT_PUBLIC_API_URL?.trim()
    const apiBase = configured
      ? configured.replace(/\/$/, '')
      : typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://127.0.0.1:3001'
        : ''
    const encoded = key.split('/').map(encodeURIComponent).join('/')
    return `${apiBase}/api/images/${encoded}`
  }

  const buildR2Url = (value: string): string | null => {
    if (!value) return null
    if (value.startsWith('data:')) return value

    if (value.startsWith('http://') || value.startsWith('https://')) {
      try {
        const parsed = new URL(value)
        const host = parsed.hostname.toLowerCase()
        if (host.includes('.r2.dev') || host.includes('.r2.cloudflarestorage.com')) {
          const key = parsed.pathname.replace(/^\/+/, '')
          return buildProxyImageUrl(key)
        }
      } catch {
        // ignore
      }
      return value
    }

    return buildProxyImageUrl(value)
  }

  const getImageUrls = (spot: FoodSpot): string[] => {
    const urls: string[] = []
    if (spot.screenshot_urls) {
      try {
        const parsed = JSON.parse(spot.screenshot_urls)
        if (Array.isArray(parsed)) {
          parsed.forEach(url => {
            if (typeof url === 'string') {
              const resolved = buildR2Url(url)
              if (resolved) urls.push(resolved)
            }
          })
        }
      } catch {
        const resolved = buildR2Url(spot.screenshot_urls)
        if (resolved) urls.push(resolved)
      }
    }
    if (spot.screenshot_r2_key) {
      const resolved = buildR2Url(spot.screenshot_r2_key)
      if (resolved) urls.push(resolved)
    }
    return urls
  }

  const extractStoredImages = (spot: FoodSpot): string[] => {
    const urls: string[] = []
    if (spot.screenshot_urls) {
      try {
        const parsed = JSON.parse(spot.screenshot_urls)
        if (Array.isArray(parsed)) {
          parsed.forEach(url => {
            if (typeof url === 'string' && url.trim()) {
              urls.push(url.trim())
            }
          })
        }
      } catch {
        if (typeof spot.screenshot_urls === 'string' && spot.screenshot_urls.trim()) {
          urls.push(spot.screenshot_urls.trim())
        }
      }
    }
    if (spot.screenshot_r2_key) {
      urls.push(spot.screenshot_r2_key)
    }
    return urls
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold font-display text-orange-600 leading-tight">
                  GourmetLog
                </h1>
                <p className="text-xs sm:text-sm text-zinc-600">
                  私人美食外脑 · 极简清单
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="mag-chip px-3 py-1.5 rounded-full text-zinc-600">
                {spots.length} 条记录
              </span>
              <div className="hidden md:flex items-center gap-2">
                <a
                  href="/ai-planner"
                  className="px-3 py-1.5 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  AI 规划
                </a>
                <a
                  href="/trips"
                  className="px-3 py-1.5 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  旅途规划
                </a>
                <a
                  href="/settings"
                  className="px-3 py-1.5 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  设置
                </a>
              </div>
              <button
                type="button"
                onClick={() => setShowActions(true)}
                className="md:hidden px-3 py-1.5 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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
          <div className="mag-card rounded-[24px] p-8 text-center">
            <p className="text-orange-700 font-medium">{error}</p>
          </div>
        ) : spots.length === 0 ? (
          <div className="text-center py-16">
            <div className="mag-card rounded-[28px] p-8 max-w-xl mx-auto">
              <div className="bg-orange-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-display text-zinc-900 mb-2">
                暂无记录
              </h2>
              <p className="text-sm text-zinc-600">
                先去录入页面添加一条餐厅记录吧。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-500" />
              <h3 className="text-base font-semibold text-zinc-800">记录清单</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-orange-200 to-transparent" />
            </div>

            <div className="rounded-[28px] border border-orange-100 bg-white/80 shadow-sm overflow-hidden">
              <div className="divide-y divide-orange-100">
                {spots.map(spot => {
                  const images = getImageUrls(spot)
                  const thumb = images[0]
                  return (
                    <div key={spot.id} className="px-5 py-5 space-y-4 text-sm text-zinc-700">
                      <div className="flex items-start gap-4">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={spot.name}
                            className="h-16 w-24 object-cover rounded-lg border border-orange-100"
                            onClick={() => setPreviewImage(thumb)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setPreviewImage(thumb)
                              }
                            }}
                            style={{ cursor: 'zoom-in' }}
                          />
                        ) : (
                          <div className="h-16 w-24 rounded-lg border border-dashed border-orange-200 text-[11px] text-zinc-400 flex items-center justify-center">
                            无图
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-zinc-900 text-base">{spot.name}</p>
                          <p className="text-xs text-zinc-500 mt-1">{formatText(spot.address_text)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-600">
                        <div>纬度：{formatCoord(spot.lat)}</div>
                        <div>经度：{formatCoord(spot.lng)}</div>
                        <div>地址：{formatText(spot.address_text)}</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="text-orange-700">口味：{formatText(spot.taste)}</div>
                        <div className="text-zinc-700">描述：{formatText(spot.summary)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingSpot(spot)}
                          className="px-3 py-1.5 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          修改
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpot(spot)}
                          className="px-3 py-1.5 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      <a
        href="/ingest"
        className="fixed bottom-6 right-6 z-30 rounded-full bg-orange-500 text-white px-5 py-3 shadow-lg hover:bg-orange-600 transition-colors"
      >
        录入美食
      </a>

      {editingSpot && (
        <SpotForm
          initialData={buildEditPayload(editingSpot)}
          isEditing={true}
          onSave={handleSpotUpdate}
          onCancel={() => setEditingSpot(null)}
        />
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
          role="presentation"
        >
          <div
            className="max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="预览大图"
              className="object-contain w-full h-full max-h-[90vh] bg-black"
            />
          </div>
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white text-lg px-3 py-2 rounded-full bg-black/40 hover:bg-black/60"
          >
            关闭
          </button>
        </div>
      )}
    </div>
  )
}
