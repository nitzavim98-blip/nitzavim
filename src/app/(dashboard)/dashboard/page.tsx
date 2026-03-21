import { Suspense } from 'react'
import TodayOverview from '@/components/dashboard/TodayOverview'
import TomorrowGaps from '@/components/dashboard/TomorrowGaps'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <Suspense fallback={<DaySectionSkeleton />}>
        <TodayOverview />
      </Suspense>
      <Suspense fallback={<DaySectionSkeleton />}>
        <TomorrowGaps />
      </Suspense>
    </div>
  )
}

function DaySectionSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonHeading} />
      <div className={styles.skeletonCard} />
      <div className={styles.skeletonCard} />
    </div>
  )
}
