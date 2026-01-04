'use client'

import React, { useEffect, useState } from 'react'
import type { CreateSpotDto } from '@/lib/types/index'
import { geocodeAddress } from '@/lib/api/spots'
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
  const [candidates, setCandidates] = useState<
    Array<{
      formatted_address: string
      province?: string
      city?: string
      district?: string
      township?: string
      adcode?: string
      lat: number
      lng: number
    }>
  >([])
  const [isMatching, setIsMatching] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [autoMatched, setAutoMatched] = useState(false)

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {}
    const hasLat = typeof formData.lat === 'number' && !Number.isNaN(formData.lat)
    const hasLng = typeof formData.lng === 'number' && !Number.isNaN(formData.lng)
    const hasAddress = !!formData.address_text?.trim()

    if (!formData.name || formData.name.trim().length === 0) {
      nextErrors.name = '餐厅名称不能为空'
    }

    if (hasLat !== hasLng) {
      nextErrors.lat = '经纬度需要成对填写'
      nextErrors.lng = '经纬度需要成对填写'
    }

    if (!hasLat && !hasLng && !hasAddress) {
      nextErrors.address_text = '未填写坐标时，地址不能为空'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
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

  const handleMatchAddress = async () => {
    const address = formData.address_text?.trim()
    if (!address) {
      setMatchError('请先填写地址再匹配')
      return
    }

    setIsMatching(true)
    setMatchError(null)
    setCandidates([])

    try {
      const combined = formData.name ? `${formData.name} ${address}` : address
      const result = await geocodeAddress(combined, formData.city || undefined)
      const nextCandidates = result.candidates || []
      if (nextCandidates.length === 0) {
        setMatchError('未找到可用地址候选')
      } else {
        setCandidates(nextCandidates)
      }
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : '地址匹配失败')
    } finally {
      setIsMatching(false)
    }
  }

  const applyCandidate = (candidate: {
    formatted_address: string
    province?: string
    city?: string
    district?: string
    township?: string
    adcode?: string
    lat: number
    lng: number
  }) => {
    setFormData(prev => ({
      ...prev,
      address_text: candidate.formatted_address,
      city: candidate.city || candidate.province || prev.city,
      lat: candidate.lat,
      lng: candidate.lng,
    }))
  }

  useEffect(() => {
    if (autoMatched) {
      return
    }
    const address = formData.address_text?.trim()
    const hasLat = typeof formData.lat === 'number' && !Number.isNaN(formData.lat)
    const hasLng = typeof formData.lng === 'number' && !Number.isNaN(formData.lng)
    if (address && !hasLat && !hasLng) {
      setAutoMatched(true)
      void handleMatchAddress()
    }
  }, [autoMatched, formData.address_text, formData.lat, formData.lng])

  useEffect(() => {
    setCandidates([])
    setMatchError(null)
    setAutoMatched(false)
  }, [formData.address_text])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-orange-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">
            {isEditing ? '编辑餐厅信息' : '确认餐厅信息'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="p-2 rounded-full hover:bg-orange-50 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-zinc-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              餐厅名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                errors.name ? 'border-red-500' : 'border-orange-100'
              }`}
              placeholder="例如：蜀大侠火锅"
              disabled={isSaving}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              地址
            </label>
            <input
              type="text"
              value={formData.address_text || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  address_text: e.target.value,
                  lat: undefined,
                  lng: undefined,
                })
              }
              className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                errors.address_text ? 'border-red-500' : 'border-orange-100'
              }`}
              placeholder="例如：北京市朝阳区三里屯路19号"
              disabled={isSaving}
            />
            {errors.address_text && (
              <p className="mt-1 text-sm text-red-500">{errors.address_text}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleMatchAddress}
                disabled={isMatching}
                className="px-4 py-2 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-60"
              >
                {isMatching ? '匹配中...' : '匹配地址候选'}
              </button>
              <span className="text-xs text-zinc-500">识别后可手动选择最准确的地址</span>
            </div>
            {matchError && <p className="mt-2 text-sm text-red-500">{matchError}</p>}
            {candidates.length > 0 && (
              <div className="mt-3 space-y-2 rounded-2xl border border-orange-100 bg-orange-50/40 p-3">
                <p className="text-xs font-medium text-zinc-600">候选地址</p>
                <div className="space-y-2">
                  {candidates.slice(0, 6).map(candidate => (
                    <button
                      key={`${candidate.formatted_address}-${candidate.adcode}-${candidate.lat}`}
                      type="button"
                      onClick={() => applyCandidate(candidate)}
                      className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-left text-xs text-zinc-700 hover:border-orange-200 hover:bg-orange-50 transition-colors"
                    >
                      <div className="font-medium text-zinc-800">
                        {candidate.formatted_address}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        {candidate.city || candidate.province || '未知城市'} · {candidate.district || '未知区域'} · {candidate.lat.toFixed(5)},{' '}
                        {candidate.lng.toFixed(5)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
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
                className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                  errors.lat ? 'border-red-500' : 'border-orange-100'
                }`}
                placeholder="39.9042"
                disabled={isSaving}
              />
              {errors.lat && <p className="mt-1 text-sm text-red-500">{errors.lat}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
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
                className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                  errors.lng ? 'border-red-500' : 'border-orange-100'
                }`}
                placeholder="116.4074"
                disabled={isSaving}
              />
              {errors.lng && <p className="mt-1 text-sm text-red-500">{errors.lng}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              口味
            </label>
            <input
              type="text"
              value={formData.taste || ''}
              onChange={e => setFormData({ ...formData, taste: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-orange-100 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="例如：麻辣鲜香 / 清淡 / 炭烤"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              AI 简短描述
            </label>
            <input
              type="text"
              value={formData.summary || ''}
              readOnly={true}
              className="w-full px-4 py-3 rounded-xl border border-orange-100 bg-orange-50/60 text-zinc-600 focus:outline-none"
              placeholder="保存后由 AI 自动更新"
            />
            <p className="mt-2 text-xs text-zinc-500">保存或修改后自动更新简短描述</p>
          </div>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {errors.general}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 px-6 py-3 rounded-xl border border-orange-100 text-zinc-700 font-medium hover:bg-orange-50 transition-colors disabled:opacity-50"
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
