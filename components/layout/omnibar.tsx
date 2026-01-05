'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { AiExtractionResult, CreateSpotDto } from '@/lib/types/index'
import { extractSpotInfo, uploadImageToR2 } from '@/lib/api/spots'
import ImageUpload from '@/components/features/image-upload'
import SpotForm from '@/components/forms/spot-form'
import { ChevronUp, Send, X } from 'lucide-react'

interface OmnibarProps {
  onSpotCreate: (spot: CreateSpotDto) => Promise<void>
  collapsible?: boolean
  onCreated?: () => void
}

export default function Omnibar({ onSpotCreate, collapsible = true, onCreated }: OmnibarProps) {
  const [descriptionText, setDescriptionText] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [localImageUrls, setLocalImageUrls] = useState<string[]>([])
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [previewSpot, setPreviewSpot] = useState<CreateSpotDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isExpanded, setIsExpanded] = useState(!collapsible)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const lastExtractedUrlRef = useRef<string | null>(null)
  const imagePreviewRef = useRef<string[]>([])

  useEffect(() => {
    inputRef.current?.focus()

    if (!collapsible) {
      setIsExpanded(true)
      return
    }

    const media = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsExpanded(media.matches ? false : true)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [collapsible])

  useEffect(() => {
    if (!shellRef.current) {
      return
    }

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        const height = Math.ceil(entry.contentRect.height)
        document.documentElement.style.setProperty('--omnibar-height', `${height}px`)
      }
    })

    observer.observe(shellRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (uploadedImageUrls.length > 0 || localImageUrls.length === 0) {
      return
    }
    setPreviewSpot(prev =>
      prev ? { ...prev, screenshot_urls: localImageUrls } : prev
    )
  }, [localImageUrls, uploadedImageUrls])

  useEffect(() => {
    // no auto extraction for link; manual trigger via按钮
    lastExtractedUrlRef.current = null
  }, [linkUrl])

  const handleDescriptionPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain')
    if (text && text.trim().length > 0) {
      setDescriptionText(text)
    }
  }

  const handleLinkPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text/plain')
    const extracted = extractFirstUrl(text)
    if (extracted) {
      e.preventDefault()
      const normalized = normalizeUrl(extracted)
      setLinkInput(normalized)
      setLinkUrl(normalized)
    }
  }

  const handleLinkBlur = () => {
    const extracted = extractFirstUrl(linkInput)
    if (!extracted) {
      setLinkUrl('')
      return
    }
    const normalized = normalizeUrl(extracted)
    setLinkInput(normalized)
    setLinkUrl(normalized)
  }

  const handleImagesSelect = async (files: File[]) => {
    setSelectedImages(files)
    setUploadedImageUrls([])
    const previews = await Promise.all(files.map(file => readFileAsDataUrl(file)))
    imagePreviewRef.current = previews
    setLocalImageUrls(previews)
    setError(null)
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
      setPreviewSpot({ ...previewSpot, screenshot_urls: urls.length > 0 ? urls : localImageUrls })
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : '图片上传失败')
  }
  }

  const extractFromText = async (text: string) => {
    setIsExtracting(true)
    setError(null)

    try {
      const combinedText = buildCombinedText(text, linkUrl)
      const result = await extractSpotInfo({ type: 'text', text: combinedText })
      createPreviewSpot(result, text, linkUrl || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 识别失败，请手动输入')
      createFallbackSpot(text, linkUrl || undefined)
    } finally {
      setIsExtracting(false)
    }
  }

  const extractFromUrl = async (url: string) => {
    setIsExtracting(true)
    setError(null)

    try {
      const result = await extractSpotInfo({ type: 'url', url })
      createPreviewSpot(result, descriptionText || undefined, url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '链接解析失败，请手动输入')
      createFallbackSpot(descriptionText || undefined, url)
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
    const previewImages = imagePreviewRef.current.length > 0 ? imagePreviewRef.current : localImageUrls
    const spot: CreateSpotDto = {
      name: result.name,
      summary: result.summary,
      address_text: result.address_text,
      taste: result.taste,
      original_share_text: originalText,
      source_url: sourceUrl,
      screenshot_urls: selectScreenshotUrls(uploadedImageUrls, previewImages),
      lat: undefined,
      lng: undefined,
    }

    setPreviewSpot(spot)
    setShowForm(true)
  }

  const createFallbackSpot = (originalText?: string, sourceUrl?: string) => {
    const previewImages = imagePreviewRef.current.length > 0 ? imagePreviewRef.current : localImageUrls
    const spot: CreateSpotDto = {
      name: '',
      summary: undefined,
      address_text: undefined,
      taste: undefined,
      original_share_text: originalText,
      source_url: sourceUrl,
      screenshot_urls: selectScreenshotUrls(uploadedImageUrls, previewImages),
      lat: undefined,
      lng: undefined,
    }

    setPreviewSpot(spot)
    setShowForm(true)
  }

  const handleSave = async (data: CreateSpotDto) => {
    try {
      const urls = await ensureUploadedImages()
      const payload: CreateSpotDto = {
        ...data,
        screenshot_urls: selectScreenshotUrls(
          urls || [],
          data.screenshot_urls || localImageUrls
        ),
      }
      await onSpotCreate(payload)
      onCreated?.()
      resetOmnibar()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  const ensureUploadedImages = async (): Promise<string[] | undefined> => {
    if (uploadedImageUrls.length > 0) {
      return uploadedImageUrls
    }

    if (selectedImages.length === 0) {
      return undefined
    }

    try {
      const urls: string[] = []
      for (const file of selectedImages) {
        const result = await uploadImageToR2(file)
        if (result.url) {
          urls.push(result.url)
        }
      }
      if (urls.length > 0) {
        setUploadedImageUrls(urls)
        setPreviewSpot(prev => (prev ? { ...prev, screenshot_urls: urls } : prev))
        return urls
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败')
    }

    return localImageUrls.length > 0 ? localImageUrls : undefined
  }

  const resetOmnibar = () => {
    setDescriptionText('')
    setLinkInput('')
    setLinkUrl('')
    setSelectedImages([])
    setLocalImageUrls([])
    setUploadedImageUrls([])
    setPreviewSpot(null)
    setError(null)
    setIsExtracting(false)
    setShowForm(false)
    lastExtractedUrlRef.current = null
    imagePreviewRef.current = []
  }

  const handleMainAction = () => {
    const hasDesc = descriptionText.trim().length > 0
    if (hasDesc) {
      extractFromText(descriptionText)
      return
    }

    if (linkUrl) {
      extractFromUrl(linkUrl)
      return
    }

    if (selectedImages[0]) {
      extractFromImage(selectedImages[0])
    }
  }

  return (
    <>
      {!showForm && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div
            ref={shellRef}
            className={`mag-shell rounded-[28px] p-4 sm:p-5 mb-4 transition-all ${isExpanded ? 'shadow-xl' : 'shadow-lg'}`}
          >
            {collapsible ? (
              <button
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-800">录入美食记录</p>
                  <p className="text-xs text-zinc-500">多图 + 文本 + 链接分开输入</p>
                </div>
                <ChevronUp
                  className={`h-5 w-5 text-orange-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            ) : (
              <div>
                <p className="text-sm font-medium text-zinc-800">录入美食记录</p>
                <p className="text-xs text-zinc-500">多图 + 文本 + 链接分开输入</p>
              </div>
            )}

            <div
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{
                maxHeight: isExpanded ? (collapsible ? '1000px' : 'none') : '0px',
                opacity: isExpanded ? 1 : 0,
                transform: isExpanded ? 'translateY(0px)' : 'translateY(8px)',
              }}
            >
              <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr_auto]">
                <ImageUpload
                  onImagesSelect={handleImagesSelect}
                  onImagesUpload={handleImagesUpload}
                />

                <div className="space-y-4">
                  <textarea
                    ref={inputRef}
                    value={descriptionText}
                    onChange={e => setDescriptionText(e.target.value)}
                    onPaste={handleDescriptionPaste}
                    placeholder="粘贴分享文本或描述（推荐）"
                    disabled={isExtracting}
                    rows={3}
                    className="mag-input w-full px-5 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] bg-white resize-none"
                  />
                  <input
                    type="url"
                    value={linkInput}
                    onChange={e => {
                      const value = e.target.value
                      setLinkInput(value)
                      const extracted = extractFirstUrl(value)
                      setLinkUrl(extracted ? normalizeUrl(extracted) : '')
                    }}
                    onPaste={handleLinkPaste}
                    onBlur={handleLinkBlur}
                    placeholder="输入或粘贴链接（自动提取网址）"
                    disabled={isExtracting}
                    className="mag-input w-full px-5 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] bg-white"
                  />
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    <span>优先使用分享文本 + 截图，链接仅作补充</span>
                    {selectedImages.length > 0 && <span>已选 {selectedImages.length} 张</span>}
                    {uploadedImageUrls.length > 0 && <span>已上传 {uploadedImageUrls.length} 张</span>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMainAction}
                  disabled={isExtracting || (!descriptionText.trim() && !linkUrl && selectedImages.length === 0)}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed transition-colors lg:h-full"
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
      )}

      {showForm && previewSpot && (
        <SpotForm
          initialData={previewSpot}
          isEditing={false}
          onSave={handleSave}
          onCancel={resetOmnibar}
        />
      )}
    </>
  )
}

function extractFirstUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i)
  if (urlMatch) {
    return urlMatch[0]
  }

  const looseMatch = trimmed.match(/\b(?:www\.)?[\w.-]+\.[a-z]{2,}[^\s]*/i)
  return looseMatch ? looseMatch[0] : null
}

function normalizeUrl(value: string): string {
  try {
    const trimmed = value.trim()
    const withScheme =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`
    return new URL(withScheme).toString()
  } catch {
    return value.trim()
  }
}

function buildCombinedText(description: string, url?: string): string {
  const trimmed = description.trim()
  if (!url) {
    return trimmed
  }
  return `${trimmed}\n来源链接：${url}`
}

function selectScreenshotUrls(uploaded: string[], local: string[]): string[] | undefined {
  if (uploaded.length > 0) {
    return uploaded
  }
  if (local.length > 0) {
    return local
  }
  return undefined
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}
