import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GourmetLog - 私人美食外脑',
  description: '只记位置，不看地图；全靠 AI，决策食物。',
  manifest: '/manifest.json',
  themeColor: '#f97316',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GourmetLog',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-900 via-zinc-950 to-zinc-100 dark:text-zinc-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
