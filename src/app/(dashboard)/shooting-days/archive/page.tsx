import Link from 'next/link'
import { Archive, ArrowRight } from 'lucide-react'
import { getArchivedShootingDays } from '@/actions/shooting-days'
import ShootingDayCard from '@/components/shooting-days/ShootingDayCard'
import styles from './archive.module.css'

export default async function ArchivePage() {
  const result = await getArchivedShootingDays()

  if ('error' in result) {
    return <p className={styles.errorText}>{result.error}</p>
  }

  const days = result.data

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <Link href="/shooting-days" className={styles.backLink}>
          <ArrowRight size={16} />
          ימי צילום
        </Link>
      </div>

      <h1 className={styles.title}>ארכיון ימי צילום</h1>

      {days.length === 0 ? (
        <div className={styles.empty}>
          <Archive size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>אין ימי צילום בארכיון</p>
        </div>
      ) : (
        <div className={styles.list}>
          {days.map((day) => (
            <ShootingDayCard key={day.id} {...day} isArchived />
          ))}
        </div>
      )}
    </div>
  )
}
