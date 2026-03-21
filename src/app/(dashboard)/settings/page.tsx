import { Suspense } from 'react'
import { requireAuth } from '@/actions/auth'
import { Skeleton } from '@/components/ui/Skeleton'
import UserManagement from '@/components/settings/UserManagement'
import TokenManagement from '@/components/settings/TokenManagement'
import AttributeOptions from '@/components/settings/AttributeOptions'
import styles from './settings.module.css'

function SectionSkeleton() {
  return (
    <div className={styles.sectionSkeleton}>
      <Skeleton height="24px" width="200px" />
      <Skeleton height="60px" />
      <Skeleton height="60px" />
    </div>
  )
}

export default async function SettingsPage() {
  const user = await requireAuth()
  const isAdmin = user.role === 'admin'

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>הגדרות</h1>

      {isAdmin && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>ניהול משתמשים</h2>
          <Suspense fallback={<SectionSkeleton />}>
            <UserManagement />
          </Suspense>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>לינקי הרשמה</h2>
        <Suspense fallback={<SectionSkeleton />}>
          <TokenManagement />
        </Suspense>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>מאפיינים פיזיים</h2>
        <Suspense fallback={<SectionSkeleton />}>
          <AttributeOptions />
        </Suspense>
      </section>
    </div>
  )
}
