'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { assignExtra } from '@/actions/extra-scenes'
import Modal from '@/components/ui/Modal'
import type { SearchResult } from '@/actions/search'
import type { SceneContextData, PickerDay } from '@/actions/scenes'
import styles from './ScenePicker.module.css'

interface ScenePickerProps {
  extra: SearchResult
  sceneId?: number
  sceneContext?: SceneContextData
  pickerScenes: PickerDay[]
  onClose: () => void
}

export default function ScenePicker({
  extra,
  sceneId,
  sceneContext,
  pickerScenes,
  onClose,
}: ScenePickerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAssign(targetSceneId: number, shootingDayId: number) {
    startTransition(async () => {
      const result = await assignExtra(extra.id, targetSceneId)
      if ('error' in result) {
        toast.error(result.error as string)
        onClose()
        return
      }
      toast.success(`${extra.fullName} שובץ לסצנה`)
      router.push(`/shooting-days/${shootingDayId}`)
    })
  }

  // Mode A: single scene context
  if (sceneId && sceneContext) {
    const gap = Math.max(
      0,
      sceneContext.scene.requiredExtras - sceneContext.scene.assignedCount
    )
    const dateStr = formatDate(sceneContext.shootingDay.date)

    return (
      <Modal
        isOpen
        onClose={onClose}
        title={`שיבוץ: ${extra.fullName}`}
      >
        <div className={styles.sceneDetail}>
          <h3 className={styles.sceneTitle}>{sceneContext.scene.title}</h3>
          <p className={styles.sceneDate}>{dateStr}</p>
          {gap > 0 ? (
            <span className={styles.gapBadge}>
              חסרים {gap} מתוך {sceneContext.scene.requiredExtras}
            </span>
          ) : (
            <span className={styles.fullBadge}>מלא</span>
          )}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.assignBtn}
            onClick={() =>
              handleAssign(sceneId, sceneContext.shootingDay.id)
            }
            disabled={isPending}
          >
            {isPending ? 'משבץ...' : 'שבץ'}
          </button>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            type="button"
          >
            ביטול
          </button>
        </div>
      </Modal>
    )
  }

  // Mode B: all scenes
  return (
    <Modal isOpen onClose={onClose} title={`שיבוץ: ${extra.fullName}`}>
      {pickerScenes.length === 0 ? (
        <p className={styles.empty}>אין ימי צילום פעילים</p>
      ) : (
        <div className={styles.dayList}>
          {pickerScenes.map((pd) => (
            <div key={pd.shootingDay.id} className={styles.daySection}>
              <h3 className={styles.dayHeader}>
                {formatDate(pd.shootingDay.date)}
                {pd.shootingDay.title && (
                  <span className={styles.dayTitle}>
                    {' '}— {pd.shootingDay.title}
                  </span>
                )}
              </h3>

              {pd.scenes.length === 0 ? (
                <p className={styles.noScenes}>אין סצנות ביום זה</p>
              ) : (
                <div className={styles.sceneList}>
                  {pd.scenes.map((scene, idx) => {
                    const gap = Math.max(
                      0,
                      scene.requiredExtras - scene.assignedCount
                    )
                    // requiredExtras=0 means "unlimited" — never treat as full
                    const isFull = scene.requiredExtras > 0 && gap === 0

                    return (
                      <div
                        key={scene.id}
                        className={`${styles.sceneRow} ${
                          isFull ? styles.sceneRowFull : ''
                        }`}
                      >
                        <span className={styles.sceneNum}>
                          {idx + 1}
                        </span>
                        <span className={styles.sceneRowTitle}>
                          {scene.title}
                        </span>
                        {isFull ? (
                          <span className={styles.fullBadge}>מלא</span>
                        ) : (
                          <span className={styles.gapBadge}>
                            חסרים {gap}
                          </span>
                        )}
                        <button
                          className={styles.assignBtn}
                          onClick={() =>
                            handleAssign(scene.id, pd.shootingDay.id)
                          }
                          disabled={isFull || isPending}
                          aria-disabled={isFull}
                        >
                          שבץ
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function formatDate(dateStr: string): string {
  try {
    // date column returns YYYY-MM-DD string; parse without timezone shift
    const [year, month, day] = dateStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return format(d, 'EEEE, d בMMMM yyyy', { locale: he })
  } catch {
    return dateStr
  }
}
