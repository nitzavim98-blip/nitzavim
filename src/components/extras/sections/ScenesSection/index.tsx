// src/components/extras/sections/ScenesSection/index.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Film } from 'lucide-react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { getExtraScenesByExtraId } from '@/actions/extra-scenes'
import type { SceneAssignmentData } from '@/actions/extra-scenes'
import { STATUS_LABELS } from '@/components/ui/StatusBadge'
import styles from './ScenesSection.module.css'

type Props = {
  extraId: number
  isExpanded: boolean
}

export default function ScenesSection({ extraId, isExpanded }: Props) {
  const [assignments, setAssignments] = useState<SceneAssignmentData[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only fetch on first expand; cache afterwards
    if (!isExpanded || assignments !== null) return
    setLoading(true)
    getExtraScenesByExtraId(extraId).then((result) => {
      setLoading(false)
      if ('data' in result) setAssignments(result.data)
    })
  }, [isExpanded, extraId, assignments])

  if (loading) {
    return <p className={styles.loading}>טוען...</p>
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className={styles.empty}>
        <Film size={32} color="var(--color-text-muted)" />
        <p className={styles.emptyText}>לא הופיע בסצנות עדיין</p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {assignments.map(({ assignment, scene, shootingDay }) => {
        const parsedDate = new Date(shootingDay.date + 'T00:00:00')
        const formattedDate = format(parsedDate, 'd בMMMM yyyy', { locale: he })

        return (
          <Link key={assignment.id} href={`/shooting-days/${shootingDay.id}`} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.sceneBadge}>סצנה {scene.sortOrder + 1}</span>
              <span className={styles.sceneTitle}>{scene.title}</span>
              <span className={styles.statusChip}>
                {STATUS_LABELS[assignment.status as keyof typeof STATUS_LABELS] ?? assignment.status}
              </span>
            </div>
            <p className={styles.date}>
              {formattedDate}
              {shootingDay.title ? ` — ${shootingDay.title}` : ''}
            </p>
            {(assignment.situation || assignment.look) && (
              <div className={styles.details}>
                {assignment.situation && (
                  <span className={styles.detail}>תפקיד: {assignment.situation}</span>
                )}
                {assignment.look && (
                  <span className={styles.lookPill}>{assignment.look}</span>
                )}
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}
