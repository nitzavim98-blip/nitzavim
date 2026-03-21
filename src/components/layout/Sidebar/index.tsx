'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Users, Search, Calendar, LayoutDashboard, Settings, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
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
        <Image src="/logo.png" alt="שיבוץ+ ניצבים" width={40} height={40} className={styles.brandLogo} />
        <span className={styles.brandName}>שיבוץ+ ניצבים</span>
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

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.signOutButton}
          aria-label="התנתק"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut size={20} aria-hidden="true" />
          <span>התנתק</span>
        </button>
      </div>
    </aside>
  )
}
