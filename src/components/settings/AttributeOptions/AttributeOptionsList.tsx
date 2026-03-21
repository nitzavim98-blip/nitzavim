'use client'

import { useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import { createAttributeOption } from '@/actions/attributes'
import styles from './AttributeOptions.module.css'

interface AttributeOption {
  id: number
  label: string
}

interface AttributeOptionsListProps {
  initialOptions: AttributeOption[]
}

export default function AttributeOptionsList({ initialOptions }: AttributeOptionsListProps) {
  const [options, setOptions] = useState<AttributeOption[]>(initialOptions)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
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
          <span>אין מאפיינים פיזיים. הוסף מאפיין ראשון.</span>
        </div>
      ) : (
        <div className={styles.tagList}>
          {options.map((option, index) => (
            <Tag key={option.id} label={option.label} index={index} />
          ))}
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
