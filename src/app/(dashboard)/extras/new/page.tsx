import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getAttributeOptions } from '@/actions/attributes'
import ExtraForm from '@/components/extras/ExtraForm'
import styles from './new.module.css'

export default async function NewExtraPage() {
  const optionsResult = await getAttributeOptions()
  const allOptions = 'data' in optionsResult ? optionsResult.data : []

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/extras" className={styles.breadcrumbLink}>
          ניצבים
        </Link>
        <ChevronRight size={16} className={styles.chevron} />
        <span className={styles.breadcrumbCurrent}>הוספת ניצב</span>
      </div>

      <h1 className={styles.title}>הוספת ניצב חדש</h1>

      <ExtraForm allOptions={allOptions} />
    </div>
  )
}
