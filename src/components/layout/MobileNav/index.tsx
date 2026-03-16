'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Search, Calendar, LayoutDashboard } from 'lucide-react'
import styles from './MobileNav.module.css'

const navItems = [
  { href: '/dashboard', label: 'בקרה', icon: LayoutDashboard },
  { href: '/extras', label: 'ניצבים', icon: Users },
  { href: '/search', label: 'חיפוש', icon: Search },
  { href: '/shooting-days', label: 'ימי צילום', icon: Calendar },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className={styles.mobileNav} aria-label="ניווט תחתון">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
