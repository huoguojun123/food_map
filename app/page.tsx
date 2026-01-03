'use client';

import React, { useState, useEffect } from 'react';
import type { CreateSpotDto, FoodSpot } from '@/lib/types/index';
import { listSpots, createSpot } from '@/lib/api/spots';
import Omnibar from '@/components/layout/omnibar';
import { Plus } from 'lucide-react';

export default function HomePage() {
  const [spots, setSpots] = useState<FoodSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load spots on mount
  useEffect(() => {
    loadSpots();
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
      throw err; // Omnibar will handle the error display
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-100 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">GourmetLog</h1>
          <p className="text-sm text-zinc-500">私人美食外脑</p>
        </div>
      </header>

      {/* Main Content - Spot Timeline */}
      <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-zinc-200 border-t-orange-500 rounded-full" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        ) : spots.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Plus className="h-12 w-12 text-zinc-400 dark:text-zinc-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">开始记录你的美食之旅</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              使用底部输入栏添加餐厅，通过 AI 自动识别
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-4">
              支持图片上传、文本粘贴，自动地理编码和 AI 总结
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {spots.map(spot => (
              <div
                key={spot.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 p-6 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
              >
                {/* Spot Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {spot.name}
                    </h3>
                    {spot.city && (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400 ml-2">
                        {spot.city}
                      </span>
                    )}
                  </div>
                  {spot.rating && (
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg">
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        ★ {spot.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* AI Summary */}
                {spot.summary && (
                  <div className="mb-4">
                    <p className="text-sm italic text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-2 inline-block">
                      {spot.summary}
                    </p>
                  </div>
                )}

                {/* Spot Details */}
                <div className="space-y-3">
                  {spot.address_text && (
                    <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Plus className="h-4 w-4 flex-shrink-0" />
                      <span>{spot.address_text}</span>
                    </div>
                  )}

                  {spot.price && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-zinc-500 dark:text-zinc-500">¥</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
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
                          className="px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {spot.my_notes && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">笔记：</span>
                        {spot.my_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-zinc-400 dark:text-zinc-600 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  {new Date(spot.created_at).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Omnibar - Bottom Input Bar */}
      <Omnibar onSpotCreate={handleSpotCreate} existingSpots={spots} />
    </div>
  );
}
