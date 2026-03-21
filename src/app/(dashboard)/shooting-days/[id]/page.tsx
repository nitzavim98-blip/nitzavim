import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getShootingDay } from '@/actions/shooting-days'
import { getScenes } from '@/actions/scenes'
import { getSceneAssignmentsForDay } from '@/actions/extra-scenes'
import ShootingDayHeader from '@/components/shooting-days/ShootingDayHeader'
import SortableSceneList from '@/components/shooting-days/SortableSceneList'
import AddSceneButton from '@/components/shooting-days/AddSceneButton'
import { Skeleton } from '@/components/ui/Skeleton'
import styles from './shooting-day-detail.module.css'

async function ScenesSectionContent({ id }: { id: number }) {
  const [dayResult, scenesResult, assignmentsResult] = await Promise.all([
    getShootingDay(id),
    getScenes(id),
    getSceneAssignmentsForDay(id),
  ])

  if ('error' in dayResult) notFound()
  if ('error' in scenesResult) notFound()

  const day = dayResult.data
  const sceneList = scenesResult.data
  const assignmentsBySceneId =
    'data' in assignmentsResult ? assignmentsResult.data : {}

  return (
    <>
      <ShootingDayHeader day={day} />

      <div className={styles.sceneSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>סצנות</h2>
          {!day.isArchived && <AddSceneButton shootingDayId={day.id} />}
        </div>
        <SortableSceneList
          scenes={sceneList}
          shootingDayId={day.id}
          assignmentsBySceneId={assignmentsBySceneId}
          isReadOnly={day.isArchived}
        />
      </div>
    </>
  )
}

function ScenesSectionSkeleton() {
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

interface ShootingDayDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ShootingDayDetailPage({ params }: ShootingDayDetailPageProps) {
  const { id: rawId } = await params
  const id = Number(rawId)
  if (isNaN(id)) notFound()

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <Link href="/shooting-days" className={styles.backLink}>
          <ArrowRight size={16} />
          ימי צילום
        </Link>
      </div>

      <Suspense fallback={<ScenesSectionSkeleton />}>
        <ScenesSectionContent id={id} />
      </Suspense>
    </div>
  )
}
