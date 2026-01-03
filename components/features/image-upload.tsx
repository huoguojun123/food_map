'use client'

import Image from 'next/image'
import React, { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'

interface ImageUploadProps {
  onImagesSelect: (files: File[]) => void
  onImagesUpload?: (files: File[]) => Promise<void>
  maxFileSize?: number
  acceptedTypes?: string[]
  className?: string
}

export default function ImageUpload({
  onImagesSelect,
  onImagesUpload,
  maxFileSize = 5 * 1024 * 1024,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className,
}: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: File[]) => {
    const validFiles: File[] = []
    for (const file of files) {
      if (!acceptedTypes.includes(file.type)) {
        setError(`不支持的文件类型: ${file.type}`)
        continue
      }
      if (file.size > maxFileSize) {
        setError('文件太大，最大 5MB')
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      return
    }

    setError(null)
    const nextFiles = [...selectedFiles, ...validFiles]
    setSelectedFiles(nextFiles)

    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })

    onImagesSelect(nextFiles)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files || [])
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !onImagesUpload) {
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 100
          }
          return prev + 10
        })
      }, 200)

      await onImagesUpload(selectedFiles)

      clearInterval(progressInterval)
      setUploadProgress(100)

      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 500)
    } catch (err) {
      setIsUploading(false)
      setUploadProgress(0)
      setError(err instanceof Error ? err.message : '上传失败')
    }
  }

  const handleRemoveImage = (index: number) => {
    const nextFiles = selectedFiles.filter((_, idx) => idx !== index)
    const nextUrls = previewUrls.filter((_, idx) => idx !== index)
    setSelectedFiles(nextFiles)
    setPreviewUrls(nextUrls)
    setError(null)
    onImagesSelect(nextFiles)

    if (fileInputRef.current && nextFiles.length === 0) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      <div
        className={`relative w-full rounded-3xl border-2 border-dashed transition-all duration-200 ${
          isDragging
            ? 'border-orange-400 bg-orange-50/80 dark:bg-orange-950/40'
            : 'border-zinc-200/70 dark:border-zinc-700 hover:border-orange-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {previewUrls.length > 0 ? (
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {previewUrls.map((url, index) => (
                <div key={url} className="relative">
                  <Image
                    src={url}
                    alt={`Preview ${index + 1}`}
                    width={220}
                    height={220}
                    unoptimized
                    className="h-24 w-full object-cover rounded-2xl"
                  />
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-2 -right-2 p-1.5 bg-white shadow-md rounded-full hover:bg-zinc-100 transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-zinc-600" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-24 rounded-2xl border border-dashed border-zinc-300 text-zinc-400 hover:border-orange-300 hover:text-orange-500 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        ) : (
          <div
            className="py-10 px-6 flex flex-col items-center justify-center text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin mb-3">
                  <Upload className="h-12 w-12 text-orange-500" />
                </div>
                <p className="text-sm font-medium">上传中... {uploadProgress}%</p>
              </div>
            ) : (
              <>
                <div
                  className={`mb-4 p-5 rounded-full transition-colors ${
                    isDragging ? 'bg-orange-100' : 'bg-zinc-100'
                  }`}
                >
                  <Upload className="h-10 w-10 text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-600 mb-2">
                  拖拽图片到此处，或点击选择文件
                </p>
                <p className="text-xs text-zinc-500">
                  支持 JPEG、PNG、WebP，最大 5MB，可多图
                </p>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple
          onChange={handleInputChange}
          className="hidden"
        />

        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 rounded-t-3xl flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="hover:bg-red-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {selectedFiles.length > 0 && onImagesUpload && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="absolute bottom-3 right-3 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
          >
            上传到云端
          </button>
        )}
      </div>
    </div>
  )
}
