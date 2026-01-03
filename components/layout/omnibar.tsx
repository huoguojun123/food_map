'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { AiExtractionResult, CreateSpotDto } from '@/lib/types/index'
import { extractSpotInfo, uploadImageToR2 } from '@/lib/api/spots'
import ImageUpload from '@/components/features/image-upload'
import SpotForm from '@/components/forms/spot-form'
import { ChevronUp, Send, X } from 'lucide-react'

interface OmnibarProps {
  onSpotCreate: (spot: CreateSpotDto) => Promise<void>
}

export default function Omnibar({ onSpotCreate }: OmnibarProps) {
  const [inputText, setInputText] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [previewSpot, setPreviewSpot] = useState<CreateSpotDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()

    const media = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsExpanded(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const handleTextPaste = async (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (text && text.trim().length > 0) {
      setInputText(text)
      await extractFromTextOrUrl(text)
    }
  }

  const handleImagesSelect = async (files: File[]) => {
    setSelectedImages(files)
    setUploadedImageUrls([])
    setError(null)
    if (files.length > 0 && !inputText.trim()) {
      await extractFromImage(files[0])
    }
  }

  const handleImagesUpload = async (files: File[]) => {
    try {
      const urls: string[] = []
      for (const file of files) {
        const result = await uploadImageToR2(file)
        if (result.url) {
          urls.push(result.url)
        }
      }
      setUploadedImageUrls(urls)
      if (previewSpot) {
        setPreviewSpot({ ...previewSpot, screenshot_urls: urls })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败')
    }
  }

  const extractFromTextOrUrl = async (text: string) => {
    setIsExtracting(true)
    setError(null)

    try {
      const trimmed = text.trim()
      const isUrl = isLikelyUrl(trimmed)
      const result = await extractSpotInfo(isUrl ? { type: 'url', url: trimmed } : { type: 'text', text })
      createPreviewSpot(result, text, isUrl ? trimmed : undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 识别失败，请手动输入')
      createFallbackSpot(text)
    } finally {
      setIsExtracting(false)
    }
  }

  const extractFromImage = async (file: File) => {
    setIsExtracting(true)
    setError(null)

    try {
      const base64 = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          const cleaned = result.split(',')[1] || result
          resolve(cleaned)
        }
        reader.readAsDataURL(file)
      })

      const result = await extractSpotInfo({ type: 'image', image: base64 })
      createPreviewSpot(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 识别失败，请手动输入')
      createFallbackSpot()
    } finally {
      setIsExtracting(false)
    }
  }

  const createPreviewSpot = (result: AiExtractionResult, originalText?: string, sourceUrl?: string) => {
    const spot: CreateSpotDto = {
      name: result.name,
      summary: result.summary,
      address_text: result.address_text,
      price: result.price,
      rating: result.rating,
      tags: result.dishes || [],
      original_share_text: originalText,
      source_url: sourceUrl,
      screenshot_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
      lat: undefined,
      lng: undefined,
    }

    setPreviewSpot(spot)
    setShowForm(true)
  }

  const createFallbackSpot = (originalText?: string) => {
    const spot: CreateSpotDto = {
      name: '',
      summary: undefined,
      address_text: undefined,
      price: undefined,
      rating: undefined,
      tags: [],
      original_share_text: originalText,
      screenshot_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
      lat: undefined,
      lng: undefined,
    }

    setPreviewSpot(spot)
    setShowForm(true)
  }

  const handleSave = async (data: CreateSpotDto) => {
    try {
      await onSpotCreate(data)
      resetOmnibar()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  const resetOmnibar = () => {
    setInputText('')
    setSelectedImages([])
    setUploadedImageUrls([])
    setPreviewSpot(null)
    setError(null)
    setIsExtracting(false)
    setShowForm(false)
  }

  const isLikelyUrl = (value: string) => {
    return /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(value)
  }

  const handleMainAction = () => {
    if (inputText.trim()) {
      extractFromTextOrUrl(inputText)
      return
    }

    if (selectedImages[0]) {
      extractFromImage(selectedImages[0])
    }
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className={`mag-shell rounded-[28px] p-4 sm:p-5 mb-4 transition-all ${isExpanded ? 'shadow-xl' : 'shadow-lg'}`}>
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="flex w-full items-center justify-between text-left lg:hidden"
            >
              <div>
                <p className="text-sm font-medium text-zinc-800">录入美食记录</p>
                <p className="text-xs text-zinc-500">多图 + 文字 + 链接混合</p>
              </div>
              <ChevronUp
                className={`h-5 w-5 text-orange-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            <div className={`${isExpanded ? 'mt-4' : 'mt-0 hidden'} lg:block`}>
              <div className="grid gap-4 lg:grid-cols-[240px_1fr_auto]">
                <ImageUpload
                  onImagesSelect={handleImagesSelect}
                  onImagesUpload={handleImagesUpload}
                />

                <div className="space-y-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onPaste={handleTextPaste}
                    placeholder="粘贴分享文本或链接，或上传多张截图..."
                    disabled={isExtracting}
                    className="mag-input w-full px-5 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    <span>支持多图、文本、链接混合</span>
                    {selectedImages.length > 0 && <span>已选 {selectedImages.length} 张</span>}
                    {uploadedImageUrls.length > 0 && <span>已上传 {uploadedImageUrls.length} 张</span>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMainAction}
                  disabled={isExtracting || (!inputText.trim() && selectedImages.length === 0)}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isExtracting ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                      识别中...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      解析并继续
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-center justify-between">
                  <p className="flex-1">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && previewSpot && (
        <SpotForm
          initialData={previewSpot}
          isEditing={true}
          onSave={handleSave}
          onCancel={resetOmnibar}
        />
      )}
    </>
  )
}
