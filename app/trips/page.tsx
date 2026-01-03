export default function TripsPage() {
  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 border-b border-orange-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mag-card rounded-[32px] p-8 space-y-4">
          <h2 className="text-xl font-display text-zinc-900">旅途列表</h2>
          <p className="text-sm text-zinc-600">
            这里会展示你保存的 AI 规划路线和清单。
          </p>
          <div className="mag-chip rounded-2xl px-4 py-3 text-sm text-zinc-600">
            功能正在完善中：路线卡片、地图外跳、行程编辑
          </div>
        </div>
      </main>
    </div>
  )
}
