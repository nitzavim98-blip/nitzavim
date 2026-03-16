'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { createAttributeOption } from '@/actions/attributes'
import toast from 'react-hot-toast'
import type { AttributeOption } from '@/db/schema/attribute-options'
import styles from './AttributePicker.module.css'

const TAG_PALETTE_COUNT = 5

interface AttributePickerProps {
  allOptions: AttributeOption[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  onOptionCreated: (option: AttributeOption) => void
}

export default function AttributePicker({
  allOptions,
  selectedIds,
  onChange,
  onOptionCreated,
}: AttributePickerProps) {
  const [customInput, setCustomInput] = useState('')
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  async function handleCreateOption() {
    const label = customInput.trim()
    if (!label) return
    setCreating(true)
    const result = await createAttributeOption(label)
    setCreating(false)
    if ('error' in result) {
      toast.error(result.error ?? 'שגיאה')
      return
    }
    onOptionCreated(result.data)
    onChange([...selectedIds, result.data.id])
    setCustomInput('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateOption()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.tags}>
        {allOptions.map((opt, idx) => {
          const palette = (idx % TAG_PALETTE_COUNT) + 1
          const selected = selectedIds.includes(opt.id)
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={[
                styles.tagBtn,
                styles[`tag${palette}`],
                selected ? styles.tagSelected : styles.tagUnselected,
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      <div className={styles.addRow}>
        <input
          ref={inputRef}
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="הוסף מאפיין חדש..."
          className={styles.addInput}
          disabled={creating}
        />
        <button
          type="button"
          onClick={handleCreateOption}
          className={styles.addBtn}
          disabled={!customInput.trim() || creating}
        >
          {creating ? '...' : 'הוסף'}
        </button>
      </div>
    </div>
  )
}
