import { Star, Car } from 'lucide-react'
import styles from './MoreInfoSection.module.css'

interface MoreInfoSectionProps {
  notes: string | null
  reliability: number
  // Mobile-only extras
  age?: number | null
  hasCar?: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

const RELIABILITY_MAP = [
  { label: 'לא אמין', className: 'badgeDanger' },
  { label: 'בסדר', className: 'badgeWarning' },
  { label: 'אמין', className: 'badgeSuccess' },
] as const

export default function MoreInfoSection({
  notes,
  reliability,
  age,
  hasCar,
  isFavorite,
  onToggleFavorite,
}: MoreInfoSectionProps) {
  const rel = RELIABILITY_MAP[reliability] ?? RELIABILITY_MAP[2]

  return (
    <div className={styles.container}>
      {/* Mobile-only: age, car, star */}
      <div className={styles.mobileExtras}>
        <button
          className={`${styles.starBtn} ${isFavorite ? styles.starActive : ''}`}
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
        >
          <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
        {age != null && <span className={styles.chip}>גיל: {age}</span>}
        {hasCar && (
          <span className={styles.chip}>
            <Car size={14} />
            יש רכב
          </span>
        )}
      </div>

      <div className={styles.reliabilityRow}>
        <span className={styles.label}>אמינות:</span>
        <span className={`${styles.badge} ${styles[rel.className]}`}>{rel.label}</span>
      </div>
      <div className={styles.notesRow}>
        <span className={styles.label}>הערות:</span>
        {notes ? (
          <p className={styles.notes}>{notes}</p>
        ) : (
          <p className={styles.empty}>אין הערות</p>
        )}
      </div>
    </div>
  )
}
