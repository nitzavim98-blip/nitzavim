import styles from './MoreInfoSection.module.css'

interface MoreInfoSectionProps {
  notes: string | null
  reliability: number
}

const RELIABILITY_MAP = [
  { label: 'לא אמין', className: 'badgeDanger' },
  { label: 'בסדר', className: 'badgeWarning' },
  { label: 'אמין', className: 'badgeSuccess' },
] as const

export default function MoreInfoSection({ notes, reliability }: MoreInfoSectionProps) {
  const rel = RELIABILITY_MAP[reliability] ?? RELIABILITY_MAP[2]

  return (
    <div className={styles.container}>
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
