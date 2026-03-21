import Link from 'next/link'
import { format, addDays } from 'date-fns'
import { he } from 'date-fns/locale'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { getShootingDayForDate } from '@/actions/shooting-days'
import DaySection from '../DaySection'
import styles from './TomorrowGaps.module.css'

export default async function TomorrowGaps() {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const result = await getShootingDayForDate(tomorrow)

  if ('error' in result) return null

  const day = result.data
  const formattedDate = format(
    new Date(tomorrow + 'T00:00:00'),
    'EEEE, d בMMMM',
    { locale: he }
  )

  return (
    <DaySection
      heading={`מחר — ${formattedDate}`}
      isEmpty={!day}
      emptyMessage="אין יום צילום מחר"
    >
      {day && (
        <div className={styles.scenes}>
          {day.scenes.length === 0 ? (
            <p className={styles.noScenes}>אין סצנות ליום זה</p>
          ) : (
            day.scenes.map((scene) => {
              const confirmedCount = scene.extras.filter(
                (e) => e.status === 'confirmed' || e.status === 'arrived'
              ).length
              const gap = Math.max(0, scene.requiredExtras - confirmedCount)

              return (
                <div key={scene.id} className={styles.sceneRow}>
                  {gap > 0 ? (
                    <div className={styles.gapRow}>
                      <AlertTriangle size={16} className={styles.gapIcon} />
                      <span className={styles.gapText}>
                        חסרים {gap} ניצבים לסצנה {scene.title}
                      </span>
                      <Link
                        href={`/search?sceneId=${scene.id}`}
                        className={styles.findLink}
                      >
                        מצא ניצבים
                      </Link>
                    </div>
                  ) : (
                    <div className={styles.fullRow}>
                      <CheckCircle size={16} className={styles.fullIcon} />
                      <span className={styles.sceneTitle}>{scene.title}</span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </DaySection>
  )
}
