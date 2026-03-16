import type { Availability } from '@/db/schema/availability'
import styles from './AvailabilitySection.module.css'

// Hebrew short day names — week starts Sunday (right column in RTL)
const DAY_HEADERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() // 0=Sun
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

interface AvailabilitySectionProps {
  availability: Pick<Availability, 'date' | 'isAvailable'>[]
}

export default function AvailabilitySection({ availability }: AvailabilitySectionProps) {
  const today = new Date()
  const todayStr = toDateStr(today)

  // Build availability map
  const availMap = new Map<string, boolean>()
  for (const a of availability) {
    availMap.set(a.date, a.isAvailable)
  }

  // Determine which months to show: current + next, plus any months in data
  const monthsToShow = new Set<string>()
  const currStr = `${today.getFullYear()}-${today.getMonth()}`
  const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const nextStr = `${nextDate.getFullYear()}-${nextDate.getMonth()}`
  monthsToShow.add(currStr)
  monthsToShow.add(nextStr)

  for (const a of availability) {
    const d = new Date(a.date + 'T00:00:00')
    monthsToShow.add(`${d.getFullYear()}-${d.getMonth()}`)
  }

  const sortedMonths = Array.from(monthsToShow)
    .map((s) => {
      const [y, m] = s.split('-').map(Number)
      return { year: y, month: m }
    })
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)

  if (availability.length === 0 && sortedMonths.length <= 2) {
    // Just show current month with no highlights if no data
  }

  return (
    <div className={styles.container}>
      {/* Legend */}
      <div className={styles.legend}>
        <span className={`${styles.legendDot} ${styles.dotAvailable}`} />
        <span className={styles.legendLabel}>פנוי</span>
        <span className={`${styles.legendDot} ${styles.dotUnavailable}`} />
        <span className={styles.legendLabel}>לא פנוי</span>
      </div>

      <div className={styles.months}>
        {sortedMonths.map(({ year, month }) => {
          const rows = buildMonthGrid(year, month)
          return (
            <div key={`${year}-${month}`} className={styles.month}>
              <div className={styles.monthTitle}>
                {HEBREW_MONTHS[month]} {year}
              </div>
              <div className={styles.grid}>
                {DAY_HEADERS.map((h) => (
                  <div key={h} className={styles.dayHeader}>{h}</div>
                ))}
                {rows.map((row, ri) =>
                  row.map((date, ci) => {
                    if (!date) return <div key={`e-${ri}-${ci}`} />
                    const dateStr = toDateStr(date)
                    const status = availMap.get(dateStr)
                    const isToday = dateStr === todayStr
                    return (
                      <div
                        key={dateStr}
                        className={[
                          styles.day,
                          status === true ? styles.available : '',
                          status === false ? styles.unavailable : '',
                          isToday ? styles.today : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {date.getDate()}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
