'use client'

import { useState, useRef } from 'react'
import { Plus, Tag as TagIcon, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { createAttributeOption, deleteAttributeOption } from '@/actions/attributes'
import styles from './AttributeOptions.module.css'

interface AttributeOption {
  id: number
  label: string
}

interface AttributeOptionsListProps {
  initialOptions: AttributeOption[]
}

const TAG_PALETTE_COUNT = 5

export default function AttributeOptionsList({ initialOptions }: AttributeOptionsListProps) {
  const [options, setOptions] = useState<AttributeOption[]>(initialOptions)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleAdd() {
    const trimmed = inputValue.trim()
    if (!trimmed) {
      toast.error('שם המאפיין לא יכול להיות ריק')
      inputRef.current?.focus()
      return
    }

    // Optimistic update with a temporary id
    const tempId = Date.now() * -1
    const optimisticOption: AttributeOption = { id: tempId, label: trimmed }
    setOptions((prev) => [...prev, optimisticOption])
    setInputValue('')

    setSaving(true)
    try {
      const result = await createAttributeOption(trimmed)
      if ('error' in result) {
        // Roll back optimistic update
        setOptions((prev) => prev.filter((o) => o.id !== tempId))
        setInputValue(trimmed)
        toast.error(result.error ?? 'שגיאה בהוספת המאפיין')
      } else {
        // Replace temp entry with real one
        setOptions((prev) =>
          prev.map((o) => (o.id === tempId ? result.data : o))
        )
        toast.success('המאפיין נוסף בהצלחה')
      }
    } catch {
      setOptions((prev) => prev.filter((o) => o.id !== tempId))
      setInputValue(trimmed)
      toast.error('שגיאה בהוספת המאפיין')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    const removed = options.find((o) => o.id === id)
    setOptions((prev) => prev.filter((o) => o.id !== id))

    try {
      const result = await deleteAttributeOption(id)
      if (result && 'error' in result) {
        setOptions((prev) => (removed ? [...prev, removed] : prev))
        toast.error(result.error ?? 'שגיאה במחיקת המאפיין')
      } else {
        toast.success('המאפיין נמחק')
      }
    } catch {
      setOptions((prev) => (removed ? [...prev, removed] : prev))
      toast.error('שגיאה במחיקת המאפיין')
    } finally {
      setDeletingId(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className={styles.container}>
      {options.length === 0 ? (
        <div className={styles.emptyState}>
          <TagIcon size={20} />
          <span>אין מאפיינים פיזיים. הוסף מאפיין ראשון.</span>
        </div>
      ) : (
        <div className={styles.tagList}>
          {options.map((option, index) => {
            const palette = (index % TAG_PALETTE_COUNT) + 1
            return (
              <span key={option.id} className={`${styles.tag} ${styles[`tag${palette}`]}`}>
                {option.label}
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(option.id)}
                  disabled={deletingId === option.id}
                  aria-label={`מחק ${option.label}`}
                >
                  <X size={12} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className={styles.addForm}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="שם המאפיין"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          maxLength={100}
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={saving}
          onClick={handleAdd}
        >
          <Plus size={16} />
          <span>הוסף מאפיין</span>
        </Button>
      </div>
    </div>
  )
}
