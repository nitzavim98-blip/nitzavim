'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import type { SearchFilters } from '@/lib/validations/search'
import type { AttributeOption } from '@/db/schema/attribute-options'
import styles from './SearchForm.module.css'

const TAG_PALETTE_COUNT = 5

interface SearchFormProps {
  initialFilters: SearchFilters
  attributeOptions: AttributeOption[]
  sceneId?: number
}

export default function SearchForm({
  initialFilters,
  attributeOptions,
  sceneId,
}: SearchFormProps) {
  const router = useRouter()

  const [q, setQ] = useState(initialFilters.q ?? '')
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<number[]>(
    initialFilters.attributeIds ?? []
  )
  const [minAge, setMinAge] = useState(
    initialFilters.minAge !== undefined ? String(initialFilters.minAge) : ''
  )
  const [maxAge, setMaxAge] = useState(
    initialFilters.maxAge !== undefined ? String(initialFilters.maxAge) : ''
  )
  const [gender, setGender] = useState<'' | '0' | '1'>(
    initialFilters.gender !== undefined ? String(initialFilters.gender) as '0' | '1' : ''
  )
  const [availableOnDate, setAvailableOnDate] = useState(
    initialFilters.availableOnDate ?? ''
  )
  const [hasCar, setHasCar] = useState(initialFilters.hasCar ?? false)

  function toggleAttribute(id: number) {
    setSelectedAttributeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (selectedAttributeIds.length > 0)
      params.set('attributeIds', selectedAttributeIds.join(','))
    if (minAge) params.set('minAge', minAge)
    if (maxAge) params.set('maxAge', maxAge)
    if (gender !== '') params.set('gender', gender)
    if (availableOnDate) params.set('availableOnDate', availableOnDate)
    if (hasCar) params.set('hasCar', 'true')
    if (sceneId !== undefined) params.set('sceneId', String(sceneId))
    router.push(`/search?${params.toString()}`)
  }

  function handleReset() {
    setQ('')
    setSelectedAttributeIds([])
    setMinAge('')
    setMaxAge('')
    setGender('')
    setAvailableOnDate('')
    setHasCar(false)
    router.push(sceneId !== undefined ? `/search?sceneId=${sceneId}` : '/search')
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2 className={styles.heading}>סינון</h2>

      {/* Text search */}
      <div className={styles.field}>
        <label htmlFor="search-q" className={styles.label}>
          שם / הערות
        </label>
        <input
          id="search-q"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש לפי שם או הערות..."
          className={styles.input}
        />
      </div>

      {/* Attribute pills */}
      <div className={styles.field}>
        <span className={styles.label}>מאפיינים פיזיים</span>
        <div className={styles.pills}>
          {attributeOptions.map((opt, idx) => {
            const palette = (idx % TAG_PALETTE_COUNT) + 1
            const isSelected = selectedAttributeIds.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleAttribute(opt.id)}
                className={`${styles.pill} ${styles[`pill${palette}`]} ${
                  isSelected ? styles.pillActive : ''
                }`}
                aria-pressed={isSelected}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Age range */}
      <div className={styles.field}>
        <span className={styles.label}>טווח גילאים</span>
        <div className={styles.ageRow}>
          <input
            type="number"
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
            placeholder="מינימום"
            min={1}
            max={120}
            className={styles.input}
            aria-label="גיל מינימום"
          />
          <span className={styles.ageSep}>–</span>
          <input
            type="number"
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
            placeholder="מקסימום"
            min={1}
            max={120}
            className={styles.input}
            aria-label="גיל מקסימום"
          />
        </div>
      </div>

      {/* Gender */}
      <div className={styles.field}>
        <span className={styles.label}>מגדר</span>
        <div className={styles.radioGroup}>
          {[
            { value: '', label: 'הכל' },
            { value: '1', label: 'זכר' },
            { value: '0', label: 'נקבה' },
          ].map((opt) => (
            <label key={opt.value} className={styles.radioLabel}>
              <input
                type="radio"
                name="gender"
                value={opt.value}
                checked={gender === opt.value}
                onChange={() => setGender(opt.value as '' | '0' | '1')}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Available on date */}
      <div className={styles.field}>
        <label htmlFor="search-date" className={styles.label}>
          פנוי בתאריך
        </label>
        <input
          id="search-date"
          type="date"
          value={availableOnDate}
          onChange={(e) => setAvailableOnDate(e.target.value)}
          className={styles.input}
        />
      </div>

      {/* Has car */}
      <div className={styles.field}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={hasCar}
            onChange={(e) => setHasCar(e.target.checked)}
          />
          יש רכב
        </label>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button type="submit" className={styles.submitBtn}>
          <Search size={16} />
          חפש
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={styles.resetBtn}
        >
          <X size={14} />
          נקה סינון
        </button>
      </div>
    </form>
  )
}
