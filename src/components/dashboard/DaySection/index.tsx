import { CalendarX } from 'lucide-react'
import styles from './DaySection.module.css'

type Props = {
  heading: string
  isEmpty: boolean
  emptyMessage: string
  children?: React.ReactNode
}

export default function DaySection({
  heading,
  isEmpty,
  emptyMessage,
  children,
}: Props) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{heading}</h2>
      {isEmpty ? (
        <div className={styles.empty}>
          <CalendarX size={32} className={styles.emptyIcon} />
          <p className={styles.emptyText}>{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </section>
  )
}
