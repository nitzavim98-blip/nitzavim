import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ShootingDayForm from '@/components/shooting-days/ShootingDayForm'
import styles from './new-shooting-day.module.css'

export default function NewShootingDayPage() {
  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <Link href="/shooting-days" className={styles.backLink}>
          <ArrowRight size={16} />
          ימי צילום
        </Link>
      </div>
      <h1 className={styles.title}>יום צילום חדש</h1>
      <div className={styles.formCard}>
        <ShootingDayForm />
      </div>
    </div>
  )
}
