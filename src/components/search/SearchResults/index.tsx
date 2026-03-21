'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, UserCircle2, Car, Star } from 'lucide-react'
import Tag from '@/components/ui/Tag'
import ScenePicker from '@/components/search/ScenePicker'
import type { SearchResult } from '@/actions/search'
import type { SceneContextData, PickerDay } from '@/actions/scenes'
import styles from './SearchResults.module.css'

interface SearchResultsProps {
  results: SearchResult[] | null
  sceneId?: number
  sceneContext?: SceneContextData
  pickerScenes: PickerDay[]
  userRole: string
}

export default function SearchResults({
  results,
  sceneId,
  sceneContext,
  pickerScenes,
  userRole,
}: SearchResultsProps) {
  const [pickerExtra, setPickerExtra] = useState<SearchResult | null>(null)

  if (results === null) {
    return (
      <div className={styles.emptyState}>
        <Search size={40} className={styles.emptyIcon} />
        <p className={styles.emptyText}>הגדר סינון וחפש ניצבים</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Search size={40} className={styles.emptyIcon} />
        <p className={styles.emptyText}>לא נמצאו ניצבים התואמים לחיפוש</p>
      </div>
    )
  }

  return (
    <>
      <p className={styles.count}>נמצאו {results.length} ניצבים</p>

      <div className={styles.grid}>
        {results.map((extra) => (
          <ExtraCard
            key={extra.id}
            extra={extra}
            canAssign={userRole !== 'guest'}
            onAssign={() => setPickerExtra(extra)}
          />
        ))}
      </div>

      {pickerExtra && (
        <ScenePicker
          extra={pickerExtra}
          sceneId={sceneId}
          sceneContext={sceneContext}
          pickerScenes={pickerScenes}
          onClose={() => setPickerExtra(null)}
        />
      )}
    </>
  )
}

// ─── ExtraCard ────────────────────────────────────────────────────────────────

interface ExtraCardProps {
  extra: SearchResult
  canAssign: boolean
  onAssign: () => void
}

function ExtraCard({ extra, canAssign, onAssign }: ExtraCardProps) {
  const topAttrs = extra.attributes.slice(0, 3)

  return (
    <div className={styles.card}>
      {/* Thumbnail */}
      <div className={styles.thumbWrapper}>
        {extra.thumbnailUrl ? (
          <Image
            src={extra.thumbnailUrl}
            alt={extra.fullName}
            fill
            className={styles.thumb}
            sizes="160px"
          />
        ) : (
          <UserCircle2
            size={48}
            className={styles.thumbPlaceholder}
            aria-hidden="true"
          />
        )}
        {extra.isFavorite && (
          <span className={styles.favBadge} aria-label="מועדף">
            <Star size={10} fill="currentColor" />
            מועדף
          </span>
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{extra.fullName}</span>
          {extra.age !== null && (
            <span className={styles.age}>גיל {extra.age}</span>
          )}
        </div>

        <div className={styles.iconsRow}>
          <span
            className={
              extra.gender === 1 ? styles.iconMale : styles.iconFemale
            }
            aria-label={extra.gender === 1 ? 'זכר' : 'נקבה'}
          >
            ●
          </span>
          {extra.hasCar && (
            <Car
              size={14}
              className={styles.iconCar}
              aria-label="יש רכב"
            />
          )}
        </div>

        {topAttrs.length > 0 && (
          <div className={styles.tags}>
            {topAttrs.map((attr, idx) => (
              <Tag key={attr.id} label={attr.label} index={idx} />
            ))}
          </div>
        )}

        {canAssign && (
          <button
            className={styles.assignBtn}
            onClick={onAssign}
            type="button"
          >
            הוסף לסצנה
          </button>
        )}
      </div>
    </div>
  )
}
