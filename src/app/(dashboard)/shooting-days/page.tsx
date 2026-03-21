import { Suspense } from 'react'
import { format } from 'date-fns'
import { CalendarX } from 'lucide-react'
import { getShootingDay } from '@/actions/shooting-days'
import { getScenes } from '@/actions/scenes'
import { getSceneAssignmentsForDay } from '@/actions/extra-scenes'
import { db } from '@/db'
import { shootingDays } from '@/db/schema/shooting-days'
import { getCurrentProduction } from '@/actions/auth'
import { and, eq } from 'drizzle-orm'
import ShootingDayHeader from '@/components/shooting-days/ShootingDayHeader'
import SortableSceneList from '@/components/shooting-days/SortableSceneList'
import AddSceneButton from '@/components/shooting-days/AddSceneButton'
import AddShootingDayButton from '@/components/shooting-days/AddShootingDayButton'
import { Skeleton } from '@/components/ui/Skeleton'
import styles from './shooting-days.module.css'

interface ShootingDaysPageProps {
  searchParams: Promise<{ date?: string }>
}

async function DayContent({ date }: { date: string }) {
  // Look up the shooting day by date
  const production = await getCurrentProduction()
  if (!production) {
    return (
      <div className={styles.empty}>
        <CalendarX size={48} className={styles.emptyIcon} />
        <p className={styles.emptyText}>לא נמצאה הפקה</p>
      </div>
    )
  }

  const dayRows = await db
    .select()
    .from(shootingDays)
    .where(
      and(
        eq(shootingDays.productionId, production.id),
        eq(shootingDays.date, date),
        eq(shootingDays.isArchived, false)
      )
    )
    .limit(1)

  const day = dayRows[0]

  if (!day) {
    return (
      <div className={styles.empty}>
        <CalendarX size={48} className={styles.emptyIcon} />
        <p className={styles.emptyText}>אין יום צילום לתאריך זה</p>
        <AddShootingDayButton date={date} />
      </div>
    )
  }

  const [dayResult, scenesResult, assignmentsResult] = await Promise.all([
    getShootingDay(day.id),
    getScenes(day.id),
    getSceneAssignmentsForDay(day.id),
  ])

  if ('error' in dayResult || 'error' in scenesResult) {
    return (
      <div className={styles.empty}>
        <CalendarX size={48} className={styles.emptyIcon} />
        <p className={styles.emptyText}>שגיאה בטעינת יום הצילום</p>
      </div>
    )
  }

  const fullDay = dayResult.data
  const sceneList = scenesResult.data
  const assignmentsBySceneId =
    'data' in assignmentsResult ? assignmentsResult.data : {}

  return (
    <>
      <ShootingDayHeader day={fullDay} />

      <div className={styles.sceneSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>סצנות</h2>
          {!fullDay.isArchived && <AddSceneButton shootingDayId={fullDay.id} />}
        </div>
        <SortableSceneList
          scenes={sceneList}
          shootingDayId={fullDay.id}
          assignmentsBySceneId={assignmentsBySceneId}
          isReadOnly={fullDay.isArchived}
        />
      </div>
    </>
  )
}

function DaySkeleton() {
  return (
    <>
      <Skeleton height="88px" borderRadius="var(--radius-md)" />
      <div className={styles.sceneSection}>
        <div className={styles.sectionHeader}>
          <Skeleton width="60px" height="20px" borderRadius="var(--radius-xs)" />
        </div>
        <div className={styles.skeletonSceneList}>
          <Skeleton height="110px" borderRadius="12px" />
          <Skeleton height="110px" borderRadius="12px" />
          <Skeleton height="110px" borderRadius="12px" />
        </div>
      </div>
    </>
  )
}

export default async function ShootingDaysPage({ searchParams }: ShootingDaysPageProps) {
  const { date } = await searchParams
  const selectedDate = date ?? format(new Date(), 'yyyy-MM-dd')

  return (
    <div className={styles.page}>
      <Suspense fallback={<DaySkeleton />}>
        <DayContent date={selectedDate} />
      </Suspense>

    </div>
  )
}
