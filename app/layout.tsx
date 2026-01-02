import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GourmetLog - 私人美食外脑',
  description: '只记位置，不看地图；全靠 AI，决策食物。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  )
}
