import { Suspense } from 'react'
import Link from 'next/link'
import { Archive, ArrowRight } from 'lucide-react'
import { getArchivedShootingDays } from '@/actions/shooting-days'
import ShootingDayCard from '@/components/shooting-days/ShootingDayCard'
import { Skeleton } from '@/components/ui/Skeleton'
import styles from './archive.module.css'

async function ArchiveList() {
  const result = await getArchivedShootingDays()

  if ('error' in result) {
    return <p className={styles.errorText}>{result.error}</p>
  }

  const days = result.data

  if (days.length === 0) {
    return (
      <div className={styles.empty}>
        <Archive size={48} className={styles.emptyIcon} />
        <p className={styles.emptyText}>אין ימי צילום בארכיון</p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {days.map((day) => (
        <ShootingDayCard key={day.id} {...day} isArchived />
      ))}
    </div>
  )
}

function ArchiveListSkeleton() {
  return (
    <div className={styles.skeletonList}>
      <Skeleton height="90px" borderRadius="12px" />
      <Skeleton height="90px" borderRadius="12px" />
      <Skeleton height="90px" borderRadius="12px" />
    </div>
  )
}

export default function ArchivePage() {
  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <Link href="/shooting-days" className={styles.backLink}>
          <ArrowRight size={16} />
          ימי צילום
        </Link>
      </div>

      <h1 className={styles.title}>ארכיון ימי צילום</h1>

      <Suspense fallback={<ArchiveListSkeleton />}>
        <ArchiveList />
      </Suspense>
    </div>
  )
}
