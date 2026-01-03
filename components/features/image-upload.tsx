'use client'

import Image from 'next/image'
import React, { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'

interface ImageUploadProps {
  onImageSelect: (file: File) => void
  onImageUpload?: (file: File) => Promise<void>
  maxFileSize?: number
  acceptedTypes?: string[]
  className?: string
}

export default function ImageUpload({
  onImageSelect,
  onImageUpload,
  maxFileSize = 5 * 1024 * 1024,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className,
}: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      setError(`不支持的文件类型: ${file.type}`)
      return
    }

    if (file.size > maxFileSize) {
      setError('文件太大，最大 5MB')
      return
    }

    setError(null)
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    onImageSelect(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
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
    if (!selectedFile || !onImageUpload) {
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

      await onImageUpload(selectedFile)

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

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div
      className={className}
    >
      <div
      className={`relative w-full rounded-2xl border-2 border-dashed transition-all duration-200 ${
        isDragging
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {previewUrl ? (
        <div className="relative w-full">
          <Image
            src={previewUrl}
            alt="Preview"
            width={800}
            height={400}
            unoptimized
            className="w-full h-64 object-cover rounded-2xl"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
              <div className="bg-white rounded-lg p-4 flex flex-col items-center">
                <div className="animate-spin mb-2">
                  <Upload className="h-8 w-8 text-orange-500" />
                </div>
                <p className="text-sm font-medium">上传中... {uploadProgress}%</p>
              </div>
            </div>
          )}
          {!isUploading && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-black/70 rounded-full hover:bg-white dark:hover:bg-black/90 transition-colors"
            >
              <X className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
            </button>
          )}
        </div>
      ) : (
        <div
          className="py-12 px-6 flex flex-col items-center justify-center text-center cursor-pointer"
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
                className={`mb-4 p-6 rounded-full transition-colors ${
                  isDragging ? 'bg-orange-100 dark:bg-orange-900' : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                <Upload className="h-12 w-12 text-zinc-600 dark:text-zinc-300" />
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                拖拽图片到此处，或点击选择文件
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                支持 JPEG、PNG、WebP 格式，最大 5MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 rounded-t-2xl flex items-center justify-between">
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

      {selectedFile && onImageUpload && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="absolute bottom-3 right-3 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
        >
          上传到云端
        </button>
      )}
      </div>
    </div>
  )
}
