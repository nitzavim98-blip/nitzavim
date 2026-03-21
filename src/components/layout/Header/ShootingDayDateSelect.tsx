'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { eachDayOfInterval, format, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'
import { Suspense } from 'react'
import styles from './Header.module.css'

interface Props {
  dateRange: { start: string; end: string }
  shootingDaysByDate: Record<string, { id: number; title: string | null }>
}

function DateSelectInner({ dateRange, shootingDaysByDate }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  if (pathname !== '/shooting-days') return null

  const dates = eachDayOfInterval({
    start: parseISO(dateRange.start),
    end: parseISO(dateRange.end),
  })

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const selectedDate = searchParams.get('date') ?? todayStr

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.replace(`/shooting-days?date=${e.target.value}`)
  }

  return (
    <select
      className={styles.dateSelect}
      value={selectedDate}
      onChange={handleChange}
      aria-label="בחר תאריך"
    >
      {dates.map((date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayInfo = shootingDaysByDate[dateStr]
        const label = format(date, 'EEEE, d בMMM', { locale: he })
        return (
          <option key={dateStr} value={dateStr}>
            {dayInfo?.title ? `${label} — ${dayInfo.title}` : label}
          </option>
        )
      })}
    </select>
  )
}

export default function ShootingDayDateSelect(props: Props) {
  return (
    <Suspense fallback={null}>
      <DateSelectInner {...props} />
    </Suspense>
  )
}
