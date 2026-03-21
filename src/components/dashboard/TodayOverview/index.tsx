import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { CheckCircle, Clock, HelpCircle } from 'lucide-react'
import { getShootingDayForDate } from '@/actions/shooting-days'
import DaySection from '../DaySection'
import styles from './TodayOverview.module.css'

export default async function TodayOverview() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const result = await getShootingDayForDate(today)

  if ('error' in result) return null

  const day = result.data
  const formattedDate = format(
    new Date(today + 'T00:00:00'),
    'EEEE, d בMMMM',
    { locale: he }
  )

  return (
    <DaySection
      heading={`היום — ${formattedDate}`}
      isEmpty={!day}
      emptyMessage="אין יום צילום היום"
    >
      {day && (
        <div className={styles.scenes}>
          {day.scenes.length === 0 ? (
            <p className={styles.noScenes}>אין סצנות ליום זה</p>
          ) : (
            day.scenes.map((scene) => (
              <div key={scene.id} className={styles.sceneBlock}>
                <div className={styles.sceneHeader}>
                  <span className={styles.sceneTitle}>{scene.title}</span>
                  <span className={styles.sceneCount}>
                    {scene.extras.length}/{scene.requiredExtras} ניצבים
                  </span>
                </div>
                {scene.extras.length > 0 && (
                  <ul className={styles.extrasList}>
                    {scene.extras.map((extra) => (
                      <li key={extra.extraId} className={styles.extraRow}>
                        <StatusIcon status={extra.status} />
                        <span className={styles.extraName}>{extra.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </DaySection>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'arrived')
    return <CheckCircle size={14} className={styles.iconSuccess} />
  if (status === 'confirmed')
    return <Clock size={14} className={styles.iconWarning} />
  return <HelpCircle size={14} className={styles.iconMuted} />
}
