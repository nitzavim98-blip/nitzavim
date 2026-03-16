'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, Plus, Search } from 'lucide-react'
import ExtraRow from '@/components/extras/ExtraRow'
import Button from '@/components/ui/Button'
import type { Extra } from '@/db/schema/extras'
import styles from './ExtrasList.module.css'

const PAGE_SIZE = 50

interface ExtrasListProps {
  extras: Extra[]
  primaryPhotoUrls?: Record<number, string>
}

export default function ExtrasList({ extras, primaryPhotoUrls = {} }: ExtrasListProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return extras
    return extras.filter((e) => e.fullName.toLowerCase().includes(q))
  }, [extras, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  if (extras.length === 0) {
    return (
      <div className={styles.empty}>
        <Users size={48} color="var(--color-text-muted)" />
        <p className={styles.emptyText}>אין ניצבים להצגה</p>
        <Link href="/extras/new">
          <Button>
            <Plus size={16} />
            הוסף ניצב ראשון
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Search bar */}
      <div className={styles.searchWrapper}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder="חיפוש לפי שם..."
          className={styles.searchInput}
          aria-label="חיפוש ניצבים לפי שם"
        />
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <div className={styles.noResults}>
          <p className={styles.noResultsText}>לא נמצאו ניצבים תואמים לחיפוש</p>
        </div>
      )}

      {/* Rows */}
      <div className={styles.list}>
        {paginated.map((extra) => (
          <ExtraRow
            key={extra.id}
            extra={extra}
            thumbnailUrl={primaryPhotoUrls[extra.id]}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="עמוד קודם"
          >
            הקודם
          </button>
          <span className={styles.pageInfo}>
            עמוד {page} מתוך {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            aria-label="עמוד הבא"
          >
            הבא
          </button>
        </div>
      )}
    </div>
  )
}
