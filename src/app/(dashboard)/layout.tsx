import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import styles from './dashboard-layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className={styles.appShell}>
      <Header />
      <main className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </main>
      <MobileNav />
    </div>
  )
}
