export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-100 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">GourmetLog</h1>
          <p className="text-sm text-zinc-500">私人美食外脑</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">欢迎使用 GourmetLog</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            只记位置，不看地图；全靠 AI，决策食物。
          </p>
        </div>
      </main>

      {/* Omnibar - 底部输入栏 */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="粘贴分享文本或上传截图..."
              className="flex-1 px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button className="px-6 py-3 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-colors">
              提交
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
