'use client'

import Omnibar from '@/components/layout/omnibar'
import type { CreateSpotDto } from '@/lib/types/index'
import { createSpot } from '@/lib/api/spots'

export default function IngestPage() {
  const handleSpotCreate = async (data: CreateSpotDto) => {
    await createSpot(data)
  }

  return (
    <div className="min-h-screen page-shell">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display text-zinc-900">录入美食记录</h1>
            <p className="text-sm text-zinc-600">多图 + 文本 + 链接混合解析</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
          >
            返回首页
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mag-card rounded-[32px] p-8">
          <p className="text-sm text-zinc-600">
            推荐直接粘贴分享文本并配合截图，链接仅作为补充信息。
          </p>
        </div>
      </main>

      <Omnibar onSpotCreate={handleSpotCreate} collapsible={false} />
    </div>
  )
}
