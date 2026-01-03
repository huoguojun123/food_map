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
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
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
      await extractFromText(text)
    }
  }

  const handleImageSelect = async (file: File) => {
    setSelectedImage(file)
    await extractFromImage(file)
  }

  const handleImageUpload = async (file: File) => {
    try {
      const result = await uploadImageToR2(file)
      if (previewSpot) {
        setPreviewSpot({ ...previewSpot, screenshot_r2_key: result.key })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败')
    }
  }

  const extractFromText = async (text: string) => {
    setIsExtracting(true)
    setError(null)

    try {
      const result = await extractSpotInfo({ type: 'text', text })
      createPreviewSpot(result, text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 识别失败，请手动输入')
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
      createPreviewSpot(result, undefined, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 识别失败，请手动输入')
      setIsExtracting(false)
    }
  }

  const createPreviewSpot = (
    result: AiExtractionResult,
    originalText?: string,
    imageName?: string
  ) => {
    const spot: CreateSpotDto = {
      name: result.name,
      summary: result.summary,
      address_text: result.address_text,
      price: result.price,
      rating: result.rating,
      tags: result.dishes || [],
      original_share_text: originalText,
      screenshot_r2_key: imageName,
      lat: undefined,
      lng: undefined,
    }

    setPreviewSpot(spot)
    setIsExtracting(false)
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
    setSelectedImage(null)
    setPreviewSpot(null)
    setError(null)
    setIsExtracting(false)
    setShowForm(false)
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-md bg-white/90 dark:bg-zinc-950/90 border-t border-zinc-200 dark:border-zinc-800 shadow-lg">
        {!showForm && (
          <div className="max-w-4xl mx-auto px-4 py-3 flex gap-3">
            <ImageUpload
              onImageSelect={handleImageSelect}
              onImageUpload={handleImageUpload}
              className="flex-shrink-0"
            />

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onPaste={handleTextPaste}
                placeholder="粘贴分享文本，或点击图片按钮上传截图..."
                disabled={isExtracting}
                className="w-full px-5 py-3 pr-12 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:opacity-60"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {inputText || selectedImage ? (
              <button
                type="button"
                onClick={() => (inputText ? extractFromText(inputText) : undefined)}
                disabled={isExtracting}
                className="flex-shrink-0 p-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:bg-orange-400 disabled:cursor-not-allowed transition-colors"
              >
                {isExtracting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    AI 识别中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    提取信息
                  </span>
                )}
              </button>
            ) : null}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <p className="text-red-700 dark:text-red-300 flex-1">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
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
