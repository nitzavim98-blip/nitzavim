import { ReactNode } from 'react'
import styles from './ExtraExpandableSection.module.css'

interface ExtraExpandableSectionProps {
  isOpen: boolean
  children: ReactNode
}

export default function ExtraExpandableSection({ isOpen, children }: ExtraExpandableSectionProps) {
  return (
    <div className={`${styles.wrapper} ${isOpen ? styles.open : ''}`} aria-hidden={!isOpen}>
      <div className={styles.inner}>{children}</div>
    </div>
  )
}
