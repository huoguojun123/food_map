'use client'

import React, { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { saveSettings } from '@/lib/api/settings'

type SettingsForm = {
  aiKey: string
  aiBaseUrl: string
  aiModel: string
  amapKey: string
}

const STORAGE_KEY = 'gourmetlog-settings'

const defaultSettings: SettingsForm = {
  aiKey: '',
  aiBaseUrl: 'https://api.siliconflow.cn/v1',
  aiModel: 'Qwen/Qwen2.5-VL-235B-A22B-Instruct',
  amapKey: '',
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return
    }

    try {
      const parsed = JSON.parse(saved) as Partial<SettingsForm>
      setForm({
        aiKey: parsed.aiKey ?? defaultSettings.aiKey,
        aiBaseUrl: parsed.aiBaseUrl ?? defaultSettings.aiBaseUrl,
        aiModel: parsed.aiModel ?? defaultSettings.aiModel,
        amapKey: parsed.amapKey ?? defaultSettings.amapKey,
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  const handleChange = (key: keyof SettingsForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const result = await saveSettings(form)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
      setSaveMessage({
        type: 'success',
        text: result?.message || '配置已保存，后端需重启后生效。',
      })
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '保存失败',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (!confirm('确定要重置为默认配置吗？')) {
      return
    }

    setForm(defaultSettings)
    setSaveMessage(null)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-32">
      <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                设置
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                管理 AI 与地图服务配置
              </p>
            </div>
            <a
              href="/"
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              返回首页
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {saveMessage && (
            <div
              className={`p-4 rounded-2xl border-2 ${
                saveMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {saveMessage.type === 'success' ? (
                  <Save className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                )}
                <p className="font-medium">{saveMessage.text}</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              AI 配置
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={form.aiKey}
                  onChange={e => handleChange('aiKey', e.target.value)}
                  placeholder="sk-...（仅保存于本机）"
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  API Base URL
                </label>
                <input
                  type="url"
                  value={form.aiBaseUrl}
                  onChange={e => handleChange('aiBaseUrl', e.target.value)}
                  placeholder="https://api.siliconflow.cn/v1"
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  模型
                </label>
                <select
                  value={form.aiModel}
                  onChange={e => handleChange('aiModel', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Qwen/Qwen2.5-VL-235B-A22B-Instruct">
                    Qwen2.5-VL（默认）
                  </option>
                  <option value="Qwen/Qwen2.5-VL-235B-A22B-Instruct-Pro">
                    Qwen2.5-VL-Pro
                  </option>
                  <option value="gpt-4o">GPT-4o</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              地图配置
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  高德地图 API Key
                </label>
                <input
                  type="text"
                  value={form.amapKey}
                  onChange={e => handleChange('amapKey', e.target.value)}
                  placeholder="3fc27acd7a1049fdaaf9cf92177d6ff0"
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-600 mt-1">
                  获取地址：https://console.amap.com/dev/key/app
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              重置默认
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 disabled:from-orange-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-orange-500/25 disabled:shadow-none"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>保存配置</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
