'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import type { AvailabilityRecord } from '@/lib/validations/extra'
import styles from './AvailabilityPicker.module.css'

const DAY_HEADERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()
  const rows: (Date | null)[][] = []
  let row: (Date | null)[] = Array(startDow).fill(null)

  for (let d = 1; d <= lastDay.getDate(); d++) {
    row.push(new Date(year, month, d))
    if (row.length === 7) {
      rows.push(row)
      row = []
    }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null)
    rows.push(row)
  }
  return rows
}

interface AvailabilityPickerProps {
  records: AvailabilityRecord[]
  onChange: (records: AvailabilityRecord[]) => void
}

export default function AvailabilityPicker({ records, onChange }: AvailabilityPickerProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const todayStr = toDateStr(today)
  const recordMap = new Map(records.map((r) => [r.date, r.isAvailable]))

  function handleDayClick(date: Date) {
    const dateStr = toDateStr(date)
    const current = recordMap.get(dateStr)

    let updated: AvailabilityRecord[]
    if (current === undefined) {
      // No entry → mark available
      updated = [...records, { date: dateStr, isAvailable: true }]
    } else if (current === true) {
      // Available → mark unavailable
      updated = records.map((r) =>
        r.date === dateStr ? { ...r, isAvailable: false } : r
      )
    } else {
      // Unavailable → remove entry
      updated = records.filter((r) => r.date !== dateStr)
    }
    onChange(updated)
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const rows = buildMonthGrid(viewYear, viewMonth)

  return (
    <div className={styles.container}>
      {/* Legend */}
      <div className={styles.legend}>
        <span className={`${styles.legendDot} ${styles.dotAvailable}`} />
        <span className={styles.legendLabel}>לחץ פעם ← פנוי</span>
        <span className={`${styles.legendDot} ${styles.dotUnavailable}`} />
        <span className={styles.legendLabel}>לחץ שוב ← לא פנוי</span>
        <span className={styles.legendLabel}>לחץ שוב ← הסר</span>
      </div>

      {/* Month navigation */}
      <div className={styles.monthNav}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={nextMonth}
          aria-label="חודש הבא"
        >
          <ChevronRight size={18} />
        </button>
        <span className={styles.monthTitle}>
          {HEBREW_MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          className={styles.navBtn}
          onClick={prevMonth}
          aria-label="חודש קודם"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className={styles.grid}>
        {DAY_HEADERS.map((h) => (
          <div key={h} className={styles.dayHeader}>{h}</div>
        ))}
        {rows.map((row, ri) =>
          row.map((date, ci) => {
            if (!date) return <div key={`e-${ri}-${ci}`} />
            const dateStr = toDateStr(date)
            const status = recordMap.get(dateStr)
            const isToday = dateStr === todayStr
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDayClick(date)}
                className={[
                  styles.day,
                  status === true ? styles.available : '',
                  status === false ? styles.unavailable : '',
                  isToday ? styles.today : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`${date.getDate()} ב${HEBREW_MONTHS[date.getMonth()]}`}
                aria-pressed={status !== undefined}
              >
                {date.getDate()}
              </button>
            )
          })
        )}
      </div>

      {/* Summary */}
      {records.length > 0 && (
        <div className={styles.summary}>
          <span className={styles.summaryText}>
            {records.filter((r) => r.isAvailable).length} תאריכים זמינים ·{' '}
            {records.filter((r) => !r.isAvailable).length} תאריכים לא זמינים
          </span>
        </div>
      )}
    </div>
  )
}
