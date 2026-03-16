import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getExtraWithDetails } from '@/actions/extras'
import { getAttributeOptions } from '@/actions/attributes'
import ExtraForm from '@/components/extras/ExtraForm'
import styles from './edit.module.css'

interface EditExtraPageProps {
  params: Promise<{ id: string }>
}

export default async function EditExtraPage({ params }: EditExtraPageProps) {
  const { id } = await params
  const extraId = parseInt(id, 10)

  if (isNaN(extraId)) notFound()

  const [detailsResult, optionsResult] = await Promise.all([
    getExtraWithDetails(extraId),
    getAttributeOptions(),
  ])

  if ('error' in detailsResult) notFound()

  const { extra, attributes, availability } = detailsResult.data
  const allOptions = 'data' in optionsResult ? optionsResult.data : []

  const initialAttributeIds = attributes.map((a) => a.id)
  const initialAvailability = availability.map((a) => ({
    date: a.date,
    isAvailable: a.isAvailable,
  }))

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/extras" className={styles.breadcrumbLink}>
          ניצבים
        </Link>
        <ChevronRight size={16} className={styles.chevron} />
        <span className={styles.breadcrumbCurrent}>{extra.fullName}</span>
      </div>

      <h1 className={styles.title}>עריכת ניצב</h1>

      <ExtraForm
        extra={extra}
        allOptions={allOptions}
        initialAttributeIds={initialAttributeIds}
        initialAvailability={initialAvailability}
      />
    </div>
  )
}
