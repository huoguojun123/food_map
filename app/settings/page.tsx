'use client'

import React, { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { saveSettings, testSettings } from '@/lib/api/settings'

type SettingsForm = {
  aiKey: string
  aiBaseUrl: string
  aiModel: string
  amapKey: string
}

type StoredSettings = {
  aiKey?: string
  aiBaseUrl?: string
  aiModel?: string
  amapKey?: string
}

const STORAGE_KEY = 'gourmetlog-settings'

const defaultSettings: SettingsForm = {
  aiKey: '',
  aiBaseUrl: '',
  aiModel: '',
  amapKey: '',
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(defaultSettings)
  const [stored, setStored] = useState<StoredSettings>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [testResult, setTestResult] = useState<{
    ai?: { ok: boolean; message: string }
    amap?: { ok: boolean; message: string }
  } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return
    }

    try {
      const parsed = JSON.parse(saved) as StoredSettings
      setStored(parsed)
      setForm({
        aiKey: '',
        aiBaseUrl: parsed.aiBaseUrl || '',
        aiModel: parsed.aiModel || '',
        amapKey: '',
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  const handleChange = (key: keyof SettingsForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const buildPayload = (): StoredSettings => {
    const payload: StoredSettings = {}

    if (form.aiKey.trim()) {
      payload.aiKey = form.aiKey.trim()
    }

    if (form.aiBaseUrl.trim()) {
      payload.aiBaseUrl = form.aiBaseUrl.trim()
    }

    if (form.aiModel.trim()) {
      payload.aiModel = form.aiModel.trim()
    }

    if (form.amapKey.trim()) {
      payload.amapKey = form.amapKey.trim()
    }

    return payload
  }

  const mergeStored = (payload: StoredSettings): StoredSettings => {
    return {
      aiKey: payload.aiKey || stored.aiKey,
      aiBaseUrl: payload.aiBaseUrl || stored.aiBaseUrl,
      aiModel: payload.aiModel || stored.aiModel,
      amapKey: payload.amapKey || stored.amapKey,
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const payload = buildPayload()
      const result = await saveSettings(payload)

      const nextStored = mergeStored(payload)
      if (!form.aiBaseUrl.trim()) {
        delete nextStored.aiBaseUrl
      }
      if (!form.aiModel.trim()) {
        delete nextStored.aiModel
      }
      if (form.aiKey.trim()) {
        nextStored.aiKey = form.aiKey.trim()
      }
      if (form.amapKey.trim()) {
        nextStored.amapKey = form.amapKey.trim()
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored))
      setStored(nextStored)
      setForm(prev => ({ ...prev, aiKey: '', amapKey: '' }))

      setSaveMessage({
        type: 'success',
        text: result?.message || '配置已保存，后端需重启后生效',
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

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const payload = buildPayload()
      const effective = mergeStored(payload)
      const result = await testSettings(effective)
      setTestResult({ ai: result.ai, amap: result.amap })
    } catch (error) {
      setTestResult({
        ai: { ok: false, message: error instanceof Error ? error.message : '测试失败' },
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleReset = () => {
    if (!confirm('确定要重置为默认配置吗？')) {
      return
    }

    setForm(defaultSettings)
    setSaveMessage(null)
    setTestResult(null)
  }

  const clearLocalSecret = (key: 'aiKey' | 'amapKey') => {
    const nextStored = { ...stored }
    delete nextStored[key]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored))
    setStored(nextStored)
    setSaveMessage({
      type: 'success',
      text: '已清除本地覆盖，将回退到环境变量配置',
    })
  }

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 border-b border-orange-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-display text-zinc-900">设置</h1>
            <p className="text-sm text-zinc-600">本地填写优先，否则使用环境变量</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
          >
            返回首页
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-8">
          {saveMessage && (
            <div
              className={`p-4 rounded-2xl border ${
                saveMessage.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {saveMessage.type === 'success' ? (
                  <Save className="h-5 w-5 text-green-600" />
                ) : (
                  <span className="text-red-600 text-lg">⚠️</span>
                )}
                <p className="font-medium">{saveMessage.text}</p>
              </div>
            </div>
          )}

          {testResult && (
            <div className="mag-card rounded-[24px] p-4 text-sm space-y-2">
              {testResult.ai && (
                <div className={testResult.ai.ok ? 'text-green-700' : 'text-red-700'}>
                  AI：{testResult.ai.message}
                </div>
              )}
              {testResult.amap && (
                <div className={testResult.amap.ok ? 'text-green-700' : 'text-red-700'}>
                  地图：{testResult.amap.message}
                </div>
              )}
            </div>
          )}

          <div className="mag-card rounded-[32px] p-6 shadow-sm">
            <h2 className="text-xl font-display text-zinc-900 mb-6">AI 配置</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={form.aiKey}
                  onChange={e => handleChange('aiKey', e.target.value)}
                  placeholder="留空则使用环境变量"
                  autoComplete="new-password"
                  name="ai-key"
                  className="w-full px-4 py-3 rounded-2xl border border-orange-100 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                {stored.aiKey && (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-zinc-500">已在本地保存，不会显示明文</span>
                    <button
                      type="button"
                      onClick={() => clearLocalSecret('aiKey')}
                      className="text-xs text-orange-600 hover:text-orange-700"
                    >
                      清除本地覆盖
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  API Base URL
                </label>
                <input
                  type="url"
                  value={form.aiBaseUrl}
                  onChange={e => handleChange('aiBaseUrl', e.target.value)}
                  placeholder={stored.aiBaseUrl || '留空则使用环境变量'}
                  className="w-full px-4 py-3 rounded-2xl border border-orange-100 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  模型
                </label>
                <input
                  type="text"
                  value={form.aiModel}
                  onChange={e => handleChange('aiModel', e.target.value)}
                  placeholder={stored.aiModel || '留空则使用环境变量'}
                  className="w-full px-4 py-3 rounded-2xl border border-orange-100 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>
          </div>

          <div className="mag-card rounded-[32px] p-6 shadow-sm">
            <h2 className="text-xl font-display text-zinc-900 mb-6">地图配置</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  高德地图 API Key
                </label>
                <input
                  type="password"
                  value={form.amapKey}
                  onChange={e => handleChange('amapKey', e.target.value)}
                  placeholder="留空则使用环境变量"
                  autoComplete="new-password"
                  name="amap-key"
                  className="w-full px-4 py-3 rounded-2xl border border-orange-100 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                {stored.amapKey && (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-zinc-500">已在本地保存，不会显示明文</span>
                    <button
                      type="button"
                      onClick={() => clearLocalSecret('amapKey')}
                      className="text-xs text-orange-600 hover:text-orange-700"
                    >
                      清除本地覆盖
                    </button>
                  </div>
                )}
                <p className="text-xs text-zinc-500 mt-2">
                  获取地址：https://console.amap.com/dev/key/app
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
            >
              重置表单
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-6 py-3 rounded-full border border-orange-300 text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-60"
            >
              {isTesting ? '测试中...' : '连通性测试'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed transition-colors"
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
