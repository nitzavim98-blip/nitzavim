'use client'

import { usePathname } from 'next/navigation'
import styles from './Header.module.css'

const pageTitles: Record<string, string> = {
  '/dashboard': 'לוח בקרה',
  '/extras': 'ניצבים',
  '/search': 'חיפוש',
  '/shooting-days': 'ימי צילום',
  '/settings': 'הגדרות',
}

export default function PageTitle() {
  const pathname = usePathname()

  // Match exact path or a prefix (e.g. /extras/123 → ניצבים)
  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(([key]) => key !== '/dashboard' && pathname.startsWith(key))?.[1]

  if (!title) return null

  return <span className={styles.pageTitle}>{title}</span>
}
