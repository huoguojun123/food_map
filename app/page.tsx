'use client';

import React, { useState, useEffect } from 'react';
import type { CreateSpotDto, FoodSpot } from '@/lib/types/index';
import { listSpots, createSpot } from '@/lib/api/spots';
import Omnibar from '@/components/layout/omnibar';
import { Plus, Sparkles, Clock, MapPin, Star } from 'lucide-react';

export default function HomePage() {
  const [spots, setSpots] = useState<FoodSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load spots on mount
  useEffect(() => {
    loadSpots();
    registerServiceWorker();
  }, []);

  const loadSpots = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listSpots();
      setSpots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpotCreate = async (data: CreateSpotDto) => {
    try {
      const newSpot = await createSpot(data);
      setSpots(prev => [newSpot, ...prev]);
    } catch (err) {
      throw err;
    }
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered');
      } catch (err) {
        console.error('Service Worker registration failed:', err);
      }
    }
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Header - 更优美的渐变设计 */}
      <header className="border-b border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md bg-white/50 dark:bg-zinc-950/50 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                GourmetLog
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                私人美食外脑
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full">
                {spots.length} 个记录
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 优化后的卡片设计 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="animate-spin h-12 w-12 border-4 border-zinc-200 border-t-orange-500 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-orange-500 animate-pulse" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 rounded-3xl p-8 text-center">
            <div className="bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Plus className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        ) : spots.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 rounded-full w-32 h-32 mx-auto mb-8 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-orange-600/20 animate-pulse" />
              <Sparkles className="h-16 w-16 text-orange-600 dark:text-orange-400 relative z-10" />
            </div>
            <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
              开始记录你的美食之旅
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-2">
              使用底部输入栏添加餐厅，通过 AI 自动识别
            </p>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-zinc-500 dark:text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                  <Plus className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span>图片上传</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                  <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span>AI 自动识别</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                  <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span>自动地理编码</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timeline indicator */}
            <div className="flex items-center gap-3 mb-6 px-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                最近记录
              </h3>
              <div className="flex-1 h-px bg-gradient-to-r from-zinc-200 to-transparent dark:from-zinc-700" />
            </div>

            {/* Spot Cards - 优化后的设计 */}
            {spots.map((spot, index) => (
              <div
                key={spot.id}
                className="group bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-700 p-6 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 relative overflow-hidden"
                style={{
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                }}
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/5 to-transparent rounded-bl-full group-hover:from-orange-500/10 transition-colors" />

                {/* Spot Header */}
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {spot.name}
                    </h3>
                    {spot.city && (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {spot.city}
                      </span>
                    )}
                  </div>
                  {spot.rating && (
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 px-4 py-2 rounded-2xl">
                      <Star className="h-4 w-4 text-orange-600 dark:text-orange-400 fill-orange-600 dark:fill-orange-400" />
                      <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                        {spot.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* AI Summary - 更突出的设计 */}
                {spot.summary && (
                  <div className="my-4">
                    <div className="inline-flex items-start gap-2 bg-gradient-to-r from-zinc-50 to-orange-50 dark:from-zinc-800/50 dark:to-orange-900/20 rounded-2xl px-4 py-3">
                      <Sparkles className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {spot.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Spot Details */}
                <div className="space-y-3 relative z-10">
                  {spot.address_text && (
                    <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-zinc-400" />
                      <span className="break-words">{spot.address_text}</span>
                    </div>
                  )}

                  {spot.price && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-orange-600 dark:text-orange-400 font-bold">¥</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg">
                        {spot.price}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-500">/人均</span>
                    </div>
                  )}

                  {spot.tags && (
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(spot.tags).map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl border border-zinc-200 dark:border-zinc-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {spot.my_notes && (
                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">💭 笔记：</span>
                        {spot.my_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timestamp - 更优雅的设计 */}
                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-700 relative z-10">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-xs text-zinc-500 dark:text-zinc-500 font-medium">
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
            ))}
          </div>
        )}
      </main>

      {/* Omnibar - Bottom Input Bar */}
      <Omnibar onSpotCreate={handleSpotCreate} existingSpots={spots} />

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
