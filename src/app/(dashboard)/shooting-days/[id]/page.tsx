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
      <div className={styles.skeletonHeader} />
      <div className={styles.sceneSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.skeletonSectionTitle} />
        </div>
        <div className={styles.skeletonSceneList}>
          <div className={styles.skeletonScene} />
          <div className={`${styles.skeletonScene} ${styles.skeletonSceneDelay1}`} />
          <div className={`${styles.skeletonScene} ${styles.skeletonSceneDelay2}`} />
        </div>
      </div>
    </>
  )
}

export default async function ShootingDayDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const id = Number(params.id)
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
