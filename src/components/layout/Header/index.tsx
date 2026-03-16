import { auth } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import { LogOut } from 'lucide-react'
import styles from './Header.module.css'

export default async function Header() {
  const session = await auth()
  const user = session?.user

  return (
    <header className={styles.header}>
      <div className={styles.userInfo}>
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
        <span className={styles.userName}>{user?.name}</span>
      </div>

      <form
        action={async () => {
          'use server'
          await signOut({ redirectTo: '/login' })
        }}
      >
        <button type="submit" className={styles.signOutButton} aria-label="התנתק">
          <LogOut size={18} aria-hidden="true" />
          <span>התנתק</span>
        </button>
      </form>
    </header>
  )
}
