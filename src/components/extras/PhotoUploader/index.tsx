'use client'

import { useState, useRef } from 'react'
import { X, Upload } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import toast from 'react-hot-toast'
import { createPhoto, deletePhoto, reorderPhotos } from '@/actions/photos'
import styles from './PhotoUploader.module.css'

export interface PhotoItem {
  id?: number
  r2Key?: string
  sortOrder: number
  url: string
  uploading?: boolean
  file?: File
}

interface PhotoUploaderProps {
  extraId?: number
  initialPhotos?: PhotoItem[]
  onPendingFilesChange?: (files: File[]) => void
}

const COMPRESSION_OPTIONS = {
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.7,
}

export default function PhotoUploader({
  extraId,
  initialPhotos = [],
  onPendingFilesChange,
}: PhotoUploaderProps) {
  const [items, setItems] = useState<PhotoItem[]>(initialPhotos)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const isPendingMode = extraId === undefined

  async function handleFileSelect(fileList: FileList) {
    const files = Array.from(fileList)
    const activeCount = items.filter((i) => !i.uploading).length

    if (activeCount + files.length > 5) {
      toast.error('מקסימום 5 תמונות מותר')
      return
    }

    if (isPendingMode) {
      const newItems: PhotoItem[] = files.map((file, idx) => ({
        sortOrder: items.length + idx,
        url: URL.createObjectURL(file),
        file,
      }))
      const updated = [...items, ...newItems]
      setItems(updated)
      onPendingFilesChange?.(updated.map((i) => i.file!).filter(Boolean))
    } else {
      for (const file of files) {
        await uploadFile(file)
      }
    }

    // Clear the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadFile(file: File) {
    const placeholder: PhotoItem = {
      sortOrder: items.length,
      url: URL.createObjectURL(file),
      uploading: true,
    }

    setItems((prev) => [...prev, placeholder])

    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS)

      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraId }),
      })

      if (!presignRes.ok) {
        const err = await presignRes.json()
        throw new Error(err.error || 'שגיאה בהעלאה')
      }

      const { uploadUrl, key } = await presignRes.json()

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: compressed,
        headers: { 'Content-Type': 'image/webp' },
      })

      if (!uploadRes.ok) throw new Error('שגיאה בהעלאה לשרת')

      const existingCount = items.filter((i) => !i.uploading && i.id !== undefined).length
      const result = await createPhoto({ extraId: extraId!, r2Key: key, sortOrder: existingCount })

      if ('error' in result) throw new Error(result.error)

      setItems((prev) => {
        const without = prev.filter((i) => i !== placeholder)
        return [
          ...without,
          {
            id: result.data.id,
            r2Key: key,
            sortOrder: result.data.sortOrder,
            url: placeholder.url,
          },
        ]
      })
    } catch (err: unknown) {
      URL.revokeObjectURL(placeholder.url)
      setItems((prev) => prev.filter((i) => i !== placeholder))
      toast.error(err instanceof Error ? err.message : 'שגיאה בהעלאת תמונה')
    }
  }

  async function handleDelete(item: PhotoItem, index: number) {
    if (isPendingMode) {
      URL.revokeObjectURL(item.url)
      const updated = items
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, sortOrder: i }))
      setItems(updated)
      onPendingFilesChange?.(updated.map((i) => i.file!).filter(Boolean))
      return
    }

    if (item.id) {
      const result = await deletePhoto(item.id)
      if ('error' in result) {
        toast.error(result.error ?? 'שגיאה במחיקת תמונה')
        return
      }
    }

    URL.revokeObjectURL(item.url)
    setItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, sortOrder: i }))
    )
    toast.success('התמונה נמחקה')
  }

  function handleDragStart(index: number) {
    dragItem.current = index
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index
  }

  async function handleDragEnd() {
    const from = dragItem.current
    const to = dragOverItem.current

    dragItem.current = null
    dragOverItem.current = null

    if (from === null || to === null || from === to) return

    const updated = [...items]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    const reordered = updated.map((item, i) => ({ ...item, sortOrder: i }))
    setItems(reordered)

    if (!isPendingMode) {
      const dbUpdates = reordered
        .filter((i) => i.id !== undefined)
        .map((i) => ({ id: i.id!, sortOrder: i.sortOrder }))
      await reorderPhotos(dbUpdates)
    } else {
      onPendingFilesChange?.(reordered.map((i) => i.file!).filter(Boolean))
    }
  }

  const canAdd = items.filter((i) => !i.uploading).length < 5

  return (
    <div className={styles.uploader}>
      <div className={styles.grid}>
        {items.map((item, index) => (
          <div
            key={item.id ?? item.url}
            className={`${styles.photoCard} ${item.uploading ? styles.uploading : ''}`}
            draggable={!item.uploading}
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
          >
            {item.uploading ? (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinner} />
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" className={styles.photo} />
                {index === 0 && <span className={styles.primaryBadge}>ראשי</span>}
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(item, index)}
                  aria-label="מחק תמונה"
                >
                  <X size={12} />
                </button>
              </>
            )}
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            className={styles.addCard}
            onClick={() => fileInputRef.current?.click()}
            aria-label="הוסף תמונה"
          >
            <Upload size={22} />
            <span className={styles.addLabel}>הוסף תמונה</span>
          </button>
        )}
      </div>

      {items.filter((i) => !i.uploading).length === 5 && (
        <p className={styles.maxNote}>הגעת למקסימום של 5 תמונות</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className={styles.hiddenInput}
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
      />
    </div>
  )
}
