'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, LayoutDashboard, Users, Search, Calendar, Settings, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import styles from './NavDrawer.module.css'

const navItems = [
  { href: '/dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { href: '/extras', label: 'ניצבים', icon: Users },
  { href: '/search', label: 'חיפוש', icon: Search },
  { href: '/shooting-days', label: 'ימי צילום', icon: Calendar },
  { href: '/settings', label: 'הגדרות', icon: Settings },
]

const DRAWER_ID = 'nav-drawer'

export default function NavDrawer() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    // Return focus to the trigger button
    hamburgerRef.current?.focus()
  }, [])

  // Close on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Focus close button when drawer opens
  useEffect(() => {
    if (open) {
      // Small delay so the CSS transition doesn't fight focus
      const id = requestAnimationFrame(() => closeBtnRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [open])

  // ESC key closes the drawer
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  // Focus trap: keep Tab/Shift+Tab inside the drawer
  useEffect(() => {
    if (!open || !drawerRef.current) return
    const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button
        ref={hamburgerRef}
        type="button"
        className={styles.hamburger}
        aria-label="פתח תפריט ניווט"
        aria-expanded={open}
        aria-controls={DRAWER_ID}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Menu size={22} aria-hidden="true" />
      </button>

      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${open ? styles.backdropVisible : ''}`}
        aria-hidden="true"
        onClick={close}
      />

      {/* Drawer */}
      <aside
        id={DRAWER_ID}
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="תפריט ניווט"
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.brand}>
            <Image src="/logo.png" alt="שיבוץ+ ניצבים" width={36} height={36} className={styles.brandLogo} />
            <span className={styles.brandName}>שיבוץ+ ניצבים</span>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.closeBtn}
            aria-label="סגור תפריט"
            onClick={close}
          >
            <X size={20} aria-hidden="true" />
          </button>
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
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut size={20} aria-hidden="true" />
            <span>התנתק</span>
          </button>
        </div>
      </aside>
    </>
  )
}
