'use client'

import React, { useEffect, useState } from 'react'
import type { CreateSpotDto } from '@/lib/types/index'
import { Check, X } from 'lucide-react'

interface SpotFormProps {
  initialData: CreateSpotDto
  isEditing: boolean
  onCancel: () => void
  onSave: (data: CreateSpotDto) => Promise<void>
}

export default function SpotForm({
  initialData,
  isEditing,
  onCancel,
  onSave,
}: SpotFormProps) {
  const [formData, setFormData] = useState<CreateSpotDto>(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (formData.address_text && (!formData.lat || !formData.lng)) {
      // 地址存在但坐标缺失时，后端会尝试地理编码
    }
  }, [formData.address_text, formData.lat, formData.lng])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    const hasLat = typeof formData.lat === 'number' && !Number.isNaN(formData.lat)
    const hasLng = typeof formData.lng === 'number' && !Number.isNaN(formData.lng)
    const hasAddress = !!formData.address_text?.trim()

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = '餐厅名称不能为空'
    }

    if (hasLat !== hasLng) {
      newErrors.lat = '经纬度需要成对填写'
      newErrors.lng = '经纬度需要成对填写'
    }

    if (!hasLat && !hasLng && !hasAddress) {
      newErrors.address_text = '未填写坐标时，地址不能为空'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSaving(true)

    try {
      await onSave(formData)
    } catch (err) {
      console.error('Save failed:', err)
      setErrors({ general: err instanceof Error ? err.message : '保存失败' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTagToggle = (tag: string) => {
    const currentTags = formData.tags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]
    setFormData({ ...formData, tags: newTags })
  }

  const presetTags = ['火锅', '烧烤', '日料', '聚会', '情侣约会', '家庭聚餐', '工作午餐']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {isEditing ? '编辑餐厅信息' : '确认餐厅信息'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              餐厅名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.name ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700'
              }`}
              placeholder="例如：蜀大侠火锅"
              disabled={isSaving}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              地址
            </label>
            <input
              type="text"
              value={formData.address_text || ''}
              onChange={e => setFormData({ ...formData, address_text: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.address_text ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700'
              }`}
              placeholder="例如：北京市朝阳区三里屯路19号"
              disabled={isSaving}
            />
            {errors.address_text && (
              <p className="mt-1 text-sm text-red-500">{errors.address_text}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                纬度
              </label>
              <input
                type="number"
                step="any"
                value={formData.lat ?? ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    lat: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.lat ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700'
                }`}
                placeholder="39.9042"
                disabled={isSaving}
              />
              {errors.lat && <p className="mt-1 text-sm text-red-500">{errors.lat}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                经度
              </label>
              <input
                type="number"
                step="any"
                value={formData.lng ?? ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    lng: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.lng ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700'
                }`}
                placeholder="116.4074"
                disabled={isSaving}
              />
              {errors.lng && <p className="mt-1 text-sm text-red-500">{errors.lng}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              城市
            </label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="例如：北京"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              AI 总结
            </label>
            <input
              type="text"
              value={formData.summary || ''}
              onChange={e => setFormData({ ...formData, summary: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="AI 生成的总结（最多 20 字）"
              maxLength={20}
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              我的笔记
            </label>
            <textarea
              value={formData.my_notes || ''}
              onChange={e => setFormData({ ...formData, my_notes: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
              placeholder="添加你的个人备注..."
              rows={3}
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              标签
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {presetTags.map(tag => {
                const active = (formData.tags || []).includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-orange-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    disabled={isSaving}
                  >
                    {tag}
                    {active && <Check className="h-4 w-4 inline ml-1" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              评分
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={formData.rating ?? ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  rating: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="1-5"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              人均价格
            </label>
            <input
              type="number"
              min="0"
              value={formData.price ?? ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  price: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="例如：150"
              disabled={isSaving}
            />
          </div>

          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl">
              {errors.general}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-6 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? '保存中...' : '保存'}
              {isSaving && <Check className="h-5 w-5 animate-spin" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
