'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { AiExtractionResult, CreateSpotDto } from '@/lib/types/index'
import { extractSpotInfo, uploadImageToR2 } from '@/lib/api/spots'
import ImageUpload from '@/components/features/image-upload'
import SpotForm from '@/components/forms/spot-form'
import { Send, X } from 'lucide-react'

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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
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

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-t border-zinc-200/70 dark:border-zinc-800 shadow-[0_-12px_30px_-20px_rgba(0,0,0,0.3)]">
        {!showForm && (
          <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-4 md:flex-row">
            <ImageUpload
              onImagesSelect={handleImagesSelect}
              onImagesUpload={handleImagesUpload}
              className="md:w-72"
            />

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onPaste={handleTextPaste}
                placeholder="粘贴分享文本或链接，或上传多张截图..."
                disabled={isExtracting}
                className="w-full px-5 py-4 pr-12 rounded-2xl border border-zinc-200/80 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400/70 disabled:bg-zinc-100/80"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
                <span>支持多图、文本、链接混合</span>
                {selectedImages.length > 0 && (
                  <span>已选 {selectedImages.length} 张图片</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (inputText.trim()) {
                  extractFromTextOrUrl(inputText)
                } else if (selectedImages[0]) {
                  extractFromImage(selectedImages[0])
                }
              }}
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
        )}

        {error && (
          <div className="bg-red-50 border-t border-red-200 px-4 py-3">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <p className="text-red-700 flex-1">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
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
