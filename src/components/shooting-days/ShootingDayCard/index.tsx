import Link from 'next/link'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { CalendarDays, Film, Users, AlertCircle } from 'lucide-react'
import styles from './ShootingDayCard.module.css'

type Props = {
  id: number
  date: string
  title?: string | null
  location?: string | null
  sceneCount: number
  totalRequiredExtras: number
  totalAssignedExtras: number
  totalGap: number
  isArchived?: boolean
}

export default function ShootingDayCard({
  id,
  date,
  title,
  location,
  sceneCount,
  totalRequiredExtras,
  totalAssignedExtras,
  totalGap,
  isArchived,
}: Props) {
  // date from DB is a string like "2026-03-17"; parse as UTC to avoid TZ shift
  const parsedDate = new Date(date + 'T00:00:00')
  const formattedDate = format(parsedDate, 'EEEE, d בMMMM yyyy', { locale: he })

  return (
    <Link href={`/shooting-days/${id}`} className={styles.card}>
      <div className={styles.header}>
        <div className={styles.dateRow}>
          <CalendarDays size={16} className={styles.dateIcon} />
          <span className={styles.date}>{formattedDate}</span>
        </div>
        {title && <h3 className={styles.title}>{title}</h3>}
        {location && <span className={styles.location}>📍 {location}</span>}
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <Film size={14} />
          <span>{sceneCount} סצנות</span>
        </div>
        <div className={styles.stat}>
          <Users size={14} />
          <span>
            {totalAssignedExtras}/{totalRequiredExtras} ניצבים
          </span>
        </div>
        {totalGap > 0 && !isArchived && (
          <div className={styles.gapChip}>
            <AlertCircle size={12} />
            <span>חסרים {totalGap} ניצבים</span>
          </div>
        )}
      </div>
    </Link>
  )
}
