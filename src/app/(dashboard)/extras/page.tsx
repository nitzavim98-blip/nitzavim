import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getExtras } from '@/actions/extras'
import ExtrasList from '@/components/extras/ExtrasList'
import { ExtraRowSkeleton } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import styles from './extras.module.css'

async function ExtrasContent() {
  const result = await getExtras()

  if ('error' in result) {
    return (
      <p className={styles.errorText}>{result.error}</p>
    )
  }

  return <ExtrasList extras={result.data} />
}

function ExtrasLoading() {
  return (
    <div className={styles.skeletonList}>
      {Array.from({ length: 5 }).map((_, i) => (
        <ExtraRowSkeleton key={i} />
      ))}
    </div>
  )
}

export default function ExtrasPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ניצבים</h1>
        <Link href="/extras/new">
          <Button>
            <Plus size={16} />
            הוספה
          </Button>
        </Link>
      </div>

      <Suspense fallback={<ExtrasLoading />}>
        <ExtrasContent />
      </Suspense>
    </div>
  )
}
