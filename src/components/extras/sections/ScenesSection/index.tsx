import { Film } from 'lucide-react'
import styles from './ScenesSection.module.css'

// Phase 3: placeholder only — fully wired in Phase 6
export default function ScenesSection() {
  return (
    <div className={styles.empty}>
      <Film size={32} color="var(--color-text-muted)" />
      <p className={styles.emptyText}>לא הופיע בסצנות עדיין</p>
    </div>
  )
}
