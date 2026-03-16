import Link from 'next/link'
import { Plus, CalendarX } from 'lucide-react'
import { getShootingDays } from '@/actions/shooting-days'
import ShootingDayCard from '@/components/shooting-days/ShootingDayCard'
import Button from '@/components/ui/Button'
import styles from './shooting-days.module.css'

export default async function ShootingDaysPage() {
  const result = await getShootingDays()

  if ('error' in result) {
    return <p className={styles.errorText}>{result.error}</p>
  }

  const days = result.data

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ימי צילום</h1>
        <Link href="/shooting-days/new">
          <Button variant="primary">
            <Plus size={16} />
            יום צילום חדש
          </Button>
        </Link>
      </div>

      {days.length === 0 ? (
        <div className={styles.empty}>
          <CalendarX size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>אין ימי צילום קרובים</p>
          <Link href="/shooting-days/new">
            <Button variant="primary">
              <Plus size={16} />
              הוסף יום צילום ראשון
            </Button>
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {days.map((day) => (
            <ShootingDayCard key={day.id} {...day} />
          ))}
        </div>
      )}

      <div className={styles.archiveLinkRow}>
        <Link href="/shooting-days/archive" className={styles.archiveLink}>
          צפה בארכיון ימי הצילום
        </Link>
      </div>
    </div>
  )
}
