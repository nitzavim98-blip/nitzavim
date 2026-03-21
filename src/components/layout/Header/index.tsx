import Image from 'next/image'
import { auth } from '@/lib/auth'
import NavDrawer from '@/components/layout/NavDrawer'
import PageTitle from './PageTitle'
import styles from './Header.module.css'

export default async function Header() {
  const session = await auth()
  const user = session?.user

  return (
    <header className={styles.header}>
      {/* Right group: hamburger · avatar · page name — rightmost in RTL */}
      <div className={styles.rightGroup}>
        <NavDrawer />
        {user?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name ?? 'משתמש'}
            className={styles.avatar}
            width={32}
            height={32}
          />
        )}
        <PageTitle />
      </div>

      {/* Logo — leftmost in RTL */}
      <div className={styles.logoSection}>
        <Image src="/logo.png" alt="שיבוץ+ ניצבים" width={32} height={32} className={styles.logoImage} />
        <span className={styles.logoName}>שיבוץ+ ניצבים</span>
      </div>
    </header>
  )
}
