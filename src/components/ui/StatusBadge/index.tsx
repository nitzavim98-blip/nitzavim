'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './StatusBadge.module.css'

export type StatusValue = 'proposed' | 'contacted' | 'confirmed' | 'arrived'

export const STATUS_LABELS: Record<StatusValue, string> = {
  proposed: 'הוצע',
  contacted: 'נשלחה הודעה',
  confirmed: 'אישר',
  arrived: 'הגיע',
}

const ALL_STATUSES: StatusValue[] = ['proposed', 'contacted', 'confirmed', 'arrived']

type Props = {
  status: StatusValue
  onStatusChange: (status: StatusValue) => Promise<void>
  disabled?: boolean
}

export default function StatusBadge({ status, onStatusChange, disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleSelect(newStatus: StatusValue) {
    if (newStatus === status) {
      setIsOpen(false)
      return
    }
    setIsUpdating(true)
    setIsOpen(false)
    await onStatusChange(newStatus)
    setIsUpdating(false)
  }

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.badge} ${styles[status]}`}
        onClick={() => !disabled && !isUpdating && setIsOpen((v) => !v)}
        disabled={disabled || isUpdating}
        aria-expanded={isOpen}
        aria-label={`סטטוס: ${STATUS_LABELS[status]}`}
      >
        {STATUS_LABELS[status]}
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.option} ${s === status ? styles.optionActive : ''}`}
              onClick={() => handleSelect(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
