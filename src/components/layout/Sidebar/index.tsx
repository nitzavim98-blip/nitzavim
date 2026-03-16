'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Search, Calendar, LayoutDashboard, Settings } from 'lucide-react'
import styles from './Sidebar.module.css'

const navItems = [
  { href: '/dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { href: '/extras', label: 'ניצבים', icon: Users },
  { href: '/search', label: 'חיפוש', icon: Search },
  { href: '/shooting-days', label: 'ימי צילום', icon: Calendar },
  { href: '/settings', label: 'הגדרות', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>ExtraCast</span>
      </div>

      <nav className={styles.nav} aria-label="ניווט ראשי">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
