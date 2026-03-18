# Phase 7 — Search Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/search` page with filter controls, a results grid, and a ScenePicker modal that lets the director assign extras to scenes.

**Architecture:** URL-driven filters — all state lives in `?searchParams`. The page is a Server Component that parses params, runs `searchExtras` server-side, and passes data down to client components. Submitting the form does `router.push` with new params, preserving `?sceneId` context when present.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM (Neon), CSS Modules, lucide-react, react-hot-toast

**Spec:** `docs/superpowers/specs/2026-03-18-phase7-search-design.md`

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `src/lib/validations/search.ts` | Create | `searchFiltersSchema` + export `SearchFilters` type |
| `src/actions/search.ts` | Create | `searchExtras` — filter extras, return `SearchResult[]` with thumbnail URLs |
| `src/actions/scenes.ts` | Modify | Add `getScenesForPicker`, export `PickerDay` + `SceneContextData` types |
| `src/app/(dashboard)/search/page.tsx` | Create | Server Component — parse params, fetch all data, render layout |
| `src/app/(dashboard)/search/search-page.module.css` | Create | Page-level layout styles |
| `src/components/search/SearchForm/index.tsx` | Create | Client form — filter controls, `router.push` on submit |
| `src/components/search/SearchForm/SearchForm.module.css` | Create | Form styles |
| `src/components/search/SearchResults/index.tsx` | Create | Client — result grid + card + opens ScenePicker |
| `src/components/search/SearchResults/SearchResults.module.css` | Create | Grid + card styles |
| `src/components/search/ScenePicker/index.tsx` | Create | Client modal — Mode A (single scene) + Mode B (all scenes) |
| `src/components/search/ScenePicker/ScenePicker.module.css` | Create | Modal styles |

---

## Chunk 1: Data Layer

### Task 1: Validation Schema

**Files:**
- Create: `src/lib/validations/search.ts`

- [ ] Create the file with this exact content:

```typescript
import { z } from 'zod'

export const searchFiltersSchema = z.object({
  q: z.string().optional(),
  attributeIds: z.array(z.number().int().positive()).optional(),
  minAge: z.number().int().positive().optional(),
  maxAge: z.number().int().positive().optional(),
  gender: z.union([z.literal(0), z.literal(1)]).optional(),
  availableOnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך לא תקין')
    .optional(),
  hasCar: z.boolean().optional(),
})

export type SearchFilters = z.infer<typeof searchFiltersSchema>
```

- [ ] Verify the file was created at the right path.

- [ ] Commit:

```bash
git add src/lib/validations/search.ts
git commit -m "feat: add searchFiltersSchema validation"
```

---

### Task 2: `searchExtras` Server Action

**Files:**
- Create: `src/actions/search.ts`

The action:
1. Calls `getCurrentProduction()` for auth + scoping
2. Validates filters with `searchFiltersSchema.safeParse`
3. Builds conditions array, runs attribute + availability pre-filters as separate queries (same pattern as `attachStats` in `shooting-days.ts`)
4. Fetches matched extras
5. Batch-fetches primary photos + attributes for matched extras
6. Generates presigned GET URLs

- [ ] Create `src/actions/search.ts`:

```typescript
'use server'

import { db } from '@/db'
import { extras } from '@/db/schema/extras'
import { extraAttributes } from '@/db/schema/extra-attributes'
import { attributeOptions } from '@/db/schema/attribute-options'
import { availability } from '@/db/schema/availability'
import { photos } from '@/db/schema/photos'
import { and, eq, isNull, inArray, or, ilike, gte, lte, sql } from 'drizzle-orm'
import { getCurrentProduction } from './auth'
import { searchFiltersSchema, type SearchFilters } from '@/lib/validations/search'
import { generatePresignedGetUrl } from '@/lib/r2'

export type SearchResult = {
  id: number
  fullName: string
  age: number | null
  gender: number
  hasCar: boolean
  isFavorite: boolean
  phone: string | null
  attributes: { id: number; label: string }[]
  thumbnailUrl: string | null
}

export async function searchExtras(filters: unknown) {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const parsed = searchFiltersSchema.safeParse(filters)
  if (!parsed.success) return { error: 'פרמטרים לא תקינים' }

  const f = parsed.data

  // Build base conditions
  const conditions = [
    eq(extras.productionId, production.id),
    isNull(extras.deletedAt),
  ]

  if (f.q) {
    conditions.push(
      or(
        ilike(extras.fullName, `%${f.q}%`),
        ilike(extras.notes, `%${f.q}%`)
      )!
    )
  }
  if (f.gender !== undefined) conditions.push(eq(extras.gender, f.gender))
  if (f.minAge !== undefined) conditions.push(gte(extras.age, f.minAge))
  if (f.maxAge !== undefined) conditions.push(lte(extras.age, f.maxAge))
  if (f.hasCar) conditions.push(eq(extras.hasCar, true))

  // Attribute AND filter: extra must have ALL selected attributes
  if (f.attributeIds && f.attributeIds.length > 0) {
    const attrRows = await db
      .select({ extraId: extraAttributes.extraId })
      .from(extraAttributes)
      .where(inArray(extraAttributes.attributeId, f.attributeIds))
      .groupBy(extraAttributes.extraId)
      .having(
        sql`count(distinct ${extraAttributes.attributeId}) = ${f.attributeIds.length}`
      )

    const ids = attrRows.map((r) => r.extraId)
    if (ids.length === 0) return { data: [] as SearchResult[] }
    conditions.push(inArray(extras.id, ids))
  }

  // Availability filter: extra must have explicit isAvailable=true row for that date
  if (f.availableOnDate) {
    const availRows = await db
      .select({ extraId: availability.extraId })
      .from(availability)
      .where(
        and(
          eq(availability.date, f.availableOnDate),
          eq(availability.isAvailable, true)
        )
      )

    const ids = availRows.map((r) => r.extraId)
    if (ids.length === 0) return { data: [] as SearchResult[] }
    conditions.push(inArray(extras.id, ids))
  }

  // Fetch matched extras
  const matchedExtras = await db
    .select()
    .from(extras)
    .where(and(...conditions))
    .orderBy(extras.fullName)

  if (matchedExtras.length === 0) return { data: [] as SearchResult[] }

  const extraIds = matchedExtras.map((e) => e.id)

  // Batch-fetch attributes
  const attrRows = await db
    .select({
      extraId: extraAttributes.extraId,
      id: attributeOptions.id,
      label: attributeOptions.label,
    })
    .from(extraAttributes)
    .innerJoin(
      attributeOptions,
      eq(extraAttributes.attributeId, attributeOptions.id)
    )
    .where(inArray(extraAttributes.extraId, extraIds))

  const attrsByExtraId: Record<number, { id: number; label: string }[]> = {}
  for (const row of attrRows) {
    if (!attrsByExtraId[row.extraId]) attrsByExtraId[row.extraId] = []
    attrsByExtraId[row.extraId].push({ id: row.id, label: row.label })
  }

  // Batch-fetch primary photos (sortOrder = 0)
  const primaryPhotos = await db
    .select({ extraId: photos.extraId, r2Key: photos.r2Key })
    .from(photos)
    .where(and(inArray(photos.extraId, extraIds), eq(photos.sortOrder, 0)))

  const photoMap: Record<number, string> = {}
  for (const p of primaryPhotos) {
    photoMap[p.extraId] = p.r2Key
  }

  // Generate presigned GET URLs
  const urlMap: Record<number, string> = {}
  await Promise.all(
    Object.entries(photoMap).map(async ([extraIdStr, r2Key]) => {
      const extraId = Number(extraIdStr)
      try {
        urlMap[extraId] = await generatePresignedGetUrl(r2Key)
      } catch {
        // If URL generation fails, skip — thumbnail will show placeholder
      }
    })
  )

  const results: SearchResult[] = matchedExtras.map((e) => ({
    id: e.id,
    fullName: e.fullName,
    age: e.age,
    gender: e.gender,
    hasCar: e.hasCar,
    isFavorite: e.isFavorite,
    phone: e.phone,
    attributes: attrsByExtraId[e.id] ?? [],
    thumbnailUrl: urlMap[e.id] ?? null,
  }))

  return { data: results }
}
```

- [ ] Run `npx tsc --noEmit` from the project root. Fix any TypeScript errors before proceeding.

- [ ] Commit:

```bash
git add src/actions/search.ts
git commit -m "feat: add searchExtras server action"
```

---

### Task 3: `getScenesForPicker` + Shared Types

**Files:**
- Modify: `src/actions/scenes.ts` (add to end of file)

- [ ] Add the following to the **top** of `src/actions/scenes.ts`, after existing imports:

```typescript
import { extraScenes } from '@/db/schema/extra-scenes'
// Add `inArray` to the existing drizzle-orm import line — `and`, `eq`, `asc` are already there
// Result: import { and, eq, asc, inArray } from 'drizzle-orm'
// `shootingDays` is already imported
```

**Important:** `extraScenes` and `inArray` are definitely not in the current `scenes.ts` imports — add both. `shootingDays` and `scenes` are already imported.

- [ ] Add the exported types and function to the **end** of `src/actions/scenes.ts`:

```typescript
// ─── Types for ScenePicker ─────────────────────────────────────────────────

export type SceneContextData = {
  scene: {
    id: number
    title: string
    requiredExtras: number
    assignedCount: number // confirmed + arrived only
  }
  shootingDay: { id: number; date: string; title: string | null }
}

export type PickerDay = {
  shootingDay: { id: number; date: string; title: string | null }
  scenes: {
    id: number
    title: string
    sortOrder: number
    requiredExtras: number
    assignedCount: number // confirmed + arrived only
  }[]
}

// ─── getScenesForPicker ────────────────────────────────────────────────────

// ─── getSceneContext ───────────────────────────────────────────────────────
// Used by the search page to resolve a sceneId into SceneContextData for the
// context banner and ScenePicker Mode A. Avoids direct db imports in pages.

export async function getSceneContext(
  sceneId: number
): Promise<{ data: SceneContextData } | { error: string }> {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const sceneRow = await db
    .select()
    .from(scenes)
    .where(eq(scenes.id, sceneId))
    .limit(1)

  if (!sceneRow[0]) return { error: 'סצנה לא נמצאה' }

  const dayRow = await db
    .select()
    .from(shootingDays)
    .where(
      and(
        eq(shootingDays.id, sceneRow[0].shootingDayId),
        eq(shootingDays.productionId, production.id)
      )
    )
    .limit(1)

  if (!dayRow[0]) return { error: 'יום הצילום לא נמצא' }

  // Count confirmed + arrived for this scene
  const confirmedRows = await db
    .select({ sceneId: extraScenes.sceneId })
    .from(extraScenes)
    .where(
      and(
        eq(extraScenes.sceneId, sceneId),
        inArray(extraScenes.status, ['confirmed', 'arrived'] as ('confirmed' | 'arrived')[])
      )
    )

  return {
    data: {
      scene: {
        id: sceneRow[0].id,
        title: sceneRow[0].title,
        requiredExtras: sceneRow[0].requiredExtras,
        assignedCount: confirmedRows.length,
      },
      shootingDay: {
        id: dayRow[0].id,
        date: dayRow[0].date,
        title: dayRow[0].title,
      },
    },
  }
}

// ─── getScenesForPicker ────────────────────────────────────────────────────

export async function getScenesForPicker(): Promise<
  { data: PickerDay[] } | { error: string }
> {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const days = await db
    .select()
    .from(shootingDays)
    .where(
      and(
        eq(shootingDays.productionId, production.id),
        eq(shootingDays.isArchived, false)
      )
    )
    .orderBy(asc(shootingDays.date))

  if (days.length === 0) return { data: [] }

  const dayIds = days.map((d) => d.id)

  const allScenes = await db
    .select()
    .from(scenes)
    .where(inArray(scenes.shootingDayId, dayIds))
    .orderBy(asc(scenes.sortOrder))

  if (allScenes.length === 0) {
    return {
      data: days.map((d) => ({
        shootingDay: { id: d.id, date: d.date, title: d.title },
        scenes: [],
      })),
    }
  }

  const sceneIds = allScenes.map((s) => s.id)

  // Count confirmed + arrived per scene
  const confirmedRows = await db
    .select({ sceneId: extraScenes.sceneId })
    .from(extraScenes)
    .where(
      and(
        inArray(extraScenes.sceneId, sceneIds),
        inArray(extraScenes.status, ['confirmed', 'arrived'] as ('confirmed' | 'arrived')[])
      )
    )

  const countByScene: Record<number, number> = {}
  for (const row of confirmedRows) {
    countByScene[row.sceneId] = (countByScene[row.sceneId] ?? 0) + 1
  }

  const result: PickerDay[] = days.map((d) => ({
    shootingDay: { id: d.id, date: d.date, title: d.title },
    scenes: allScenes
      .filter((s) => s.shootingDayId === d.id)
      .map((s) => ({
        id: s.id,
        title: s.title,
        sortOrder: s.sortOrder,
        requiredExtras: s.requiredExtras,
        assignedCount: countByScene[s.id] ?? 0,
      })),
  }))

  return { data: result }
}
```

- [ ] Run `npx tsc --noEmit`. Fix any TypeScript errors.

- [ ] Commit:

```bash
git add src/actions/scenes.ts
git commit -m "feat: add getScenesForPicker action and PickerDay/SceneContextData types"
```

---

## Chunk 2: Page & SearchForm

### Task 4: Search Page (Server Component)

**Files:**
- Create: `src/app/(dashboard)/search/page.tsx`
- Create: `src/app/(dashboard)/search/search-page.module.css`

The page:
1. Parses `searchParams` into typed filters
2. If `sceneId` is present, fetches scene + day for the context banner
3. If any filter params are present, calls `searchExtras`
4. Always fetches `getAttributeOptions` + `getScenesForPicker`
5. Gets current user role for guest check
6. Renders the context banner (if `sceneId`), `SearchForm`, and `SearchResults`

- [ ] Create `src/app/(dashboard)/search/page.tsx`:

```typescript
import { X } from 'lucide-react'
import Link from 'next/link'
import { getAttributeOptions } from '@/actions/attributes'
import { getScenesForPicker, getSceneContext } from '@/actions/scenes'
import { searchExtras } from '@/actions/search'
import { getCurrentUser } from '@/actions/auth'
import type { SearchFilters } from '@/lib/validations/search'
import type { SceneContextData } from '@/actions/scenes'
import type { SearchResult } from '@/actions/search'
import SearchForm from '@/components/search/SearchForm'
import SearchResults from '@/components/search/SearchResults'
import styles from './search-page.module.css'

function parseSearchParams(sp: {
  [key: string]: string | string[] | undefined
}): SearchFilters {
  const get = (key: string) =>
    typeof sp[key] === 'string' ? (sp[key] as string) : undefined

  const q = get('q') || undefined

  const rawAttributeIds = get('attributeIds')
  const attributeIds = rawAttributeIds
    ? rawAttributeIds
        .split(',')
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0)
    : undefined

  const rawMinAge = get('minAge')
  const minAge =
    rawMinAge !== undefined && !isNaN(Number(rawMinAge))
      ? Number(rawMinAge)
      : undefined

  const rawMaxAge = get('maxAge')
  const maxAge =
    rawMaxAge !== undefined && !isNaN(Number(rawMaxAge))
      ? Number(rawMaxAge)
      : undefined

  const rawGender = get('gender')
  const gender =
    rawGender === '0' ? 0 : rawGender === '1' ? 1 : undefined

  const availableOnDate = get('availableOnDate') || undefined

  const hasCar = get('hasCar') === 'true' ? true : undefined

  return { q, attributeIds, minAge, maxAge, gender, availableOnDate, hasCar }
}

function hasAnyFilter(f: SearchFilters): boolean {
  return !!(
    f.q ||
    (f.attributeIds && f.attributeIds.length > 0) ||
    f.minAge !== undefined ||
    f.maxAge !== undefined ||
    f.gender !== undefined ||
    f.availableOnDate ||
    f.hasCar !== undefined
  )
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseSearchParams(searchParams)
  const rawSceneId =
    typeof searchParams.sceneId === 'string'
      ? Number(searchParams.sceneId)
      : undefined
  const sceneId =
    rawSceneId !== undefined && !isNaN(rawSceneId) ? rawSceneId : undefined

  // Parallel fetches — note: getSceneContext runs separately after if sceneId present
  const [attrResult, pickerResult, user] = await Promise.all([
    getAttributeOptions(),
    getScenesForPicker(),
    getCurrentUser(),
  ])

  const attributeOptions = 'data' in attrResult ? attrResult.data : []
  const pickerScenes = 'data' in pickerResult ? pickerResult.data : []
  const userRole = user?.role ?? 'guest'

  // Fetch scene context via server action (no direct db import in pages)
  let sceneContext: SceneContextData | undefined

  if (sceneId) {
    const ctxResult = await getSceneContext(sceneId)
    if ('data' in ctxResult) sceneContext = ctxResult.data
  }

  // Run search if any filter is active
  let results: SearchResult[] | null = null
  if (hasAnyFilter(filters)) {
    const searchResult = await searchExtras(filters)
    results = 'data' in searchResult ? searchResult.data : []
  }

  return (
    <div className={styles.page}>
      {sceneContext && (
        <div className={styles.contextBanner}>
          <span>
            משבץ ניצב לסצנה:{' '}
            <strong>{sceneContext.scene.title}</strong>
          </span>
          <Link
            href={`/shooting-days/${sceneContext.shootingDay.id}`}
            className={styles.contextClose}
            aria-label="בטל שיבוץ וחזור ליום הצילום"
          >
            <X size={16} />
          </Link>
        </div>
      )}

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <SearchForm
            initialFilters={filters}
            attributeOptions={attributeOptions}
            sceneId={sceneId}
          />
        </aside>

        <main className={styles.content}>
          <SearchResults
            results={results}
            sceneId={sceneId}
            sceneContext={sceneContext}
            pickerScenes={pickerScenes}
            userRole={userRole}
          />
        </main>
      </div>
    </div>
  )
}
```

- [ ] Create `src/app/(dashboard)/search/search-page.module.css`:

```css
.page {
  padding: var(--space-6);
  max-width: 900px;
  margin: 0 auto;
}

.contextBanner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-primary-subtle);
  color: var(--color-primary-text);
  border-radius: 8px;
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  font-size: 0.875rem;
  font-weight: 500;
}

.contextClose {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-text);
  padding: var(--space-1);
  border-radius: 4px;
  transition: background-color 150ms ease;
}

.contextClose:hover {
  background: var(--color-primary);
  color: #fff;
}

.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-6);
  align-items: start;
}

@media (max-width: 768px) {
  .page {
    padding: var(--space-4);
  }

  .layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] Navigate to `http://localhost:3000/search` in the browser. Confirm the page renders without errors (filters form area on right, empty state on left).

- [ ] Commit:

```bash
git add src/app/(dashboard)/search/page.tsx src/app/(dashboard)/search/search-page.module.css
git commit -m "feat: add search page server component"
```

---

### Task 5: SearchForm Component

**Files:**
- Create: `src/components/search/SearchForm/index.tsx`
- Create: `src/components/search/SearchForm/SearchForm.module.css`

- [ ] Create `src/components/search/SearchForm/index.tsx`:

```typescript
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
```

- [ ] Create `src/components/search/SearchForm/SearchForm.module.css`:

```css
.form {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.heading {
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--color-text);
  background: var(--color-card);
  box-sizing: border-box;
  transition: border-color 150ms ease;
}

.input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-color: var(--color-primary);
}

/* Attribute pills */
.pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.pill {
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: opacity 150ms ease, border-color 150ms ease;
  font-family: inherit;
}

.pill:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.pill1 { background: var(--color-tag-1-bg); color: var(--color-tag-1-text); }
.pill2 { background: var(--color-tag-2-bg); color: var(--color-tag-2-text); }
.pill3 { background: var(--color-tag-3-bg); color: var(--color-tag-3-text); }
.pill4 { background: var(--color-tag-4-bg); color: var(--color-tag-4-text); }
.pill5 { background: var(--color-tag-5-bg); color: var(--color-tag-5-text); }

.pill1.pillActive { border-color: var(--color-tag-1-text); }
.pill2.pillActive { border-color: var(--color-tag-2-text); }
.pill3.pillActive { border-color: var(--color-tag-3-text); }
.pill4.pillActive { border-color: var(--color-tag-4-text); }
.pill5.pillActive { border-color: var(--color-tag-5-text); }

/* Age row */
.ageRow {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ageRow .input {
  flex: 1;
}

.ageSep {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

/* Gender */
.radioGroup {
  display: flex;
  gap: var(--space-4);
}

.radioLabel {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
  cursor: pointer;
}

/* Has car */
.checkboxLabel {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
  cursor: pointer;
}

/* Actions */
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.submitBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.submitBtn:hover {
  background: var(--color-primary-light);
}

.submitBtn:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.resetBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  background: transparent;
  color: var(--color-text-muted);
  border: none;
  font-family: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: color 150ms ease;
}

.resetBtn:hover {
  color: var(--color-text-secondary);
}
```

- [ ] Navigate to `http://localhost:3000/search`. Verify:
  - Form renders with all filter controls
  - Attribute pills show all options with palette colors
  - Submitting the form with a name query updates the URL and re-renders the page
  - "נקה סינון" resets the URL

- [ ] Commit:

```bash
git add src/components/search/SearchForm/
git commit -m "feat: add SearchForm component"
```

---

## Chunk 3: Results & ScenePicker

### Task 6: SearchResults Component

**Files:**
- Create: `src/components/search/SearchResults/index.tsx`
- Create: `src/components/search/SearchResults/SearchResults.module.css`

- [ ] Create `src/components/search/SearchResults/index.tsx`:

```typescript
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
```

- [ ] Create `src/components/search/SearchResults/SearchResults.module.css`:

```css
/* Empty state */
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-12);
  color: var(--color-text-muted);
}

.emptyIcon {
  opacity: 0.4;
}

.emptyText {
  font-size: 0.9375rem;
  font-weight: 500;
  margin: 0;
}

/* Result count */
.count {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-4);
}

/* Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

@media (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

/* Card */
.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 150ms ease;
}

.card:hover {
  border-color: var(--color-primary-light);
}

/* Thumbnail */
.thumbWrapper {
  position: relative;
  aspect-ratio: 1;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumb {
  object-fit: cover;
}

.thumbPlaceholder {
  color: var(--color-text-muted);
}

.favBadge {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: flex;
  align-items: center;
  gap: 3px;
  background: var(--color-primary-subtle);
  color: var(--color-primary-text);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 100px;
}

/* Info */
.info {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
}

.nameRow {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.name {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
}

.age {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.iconsRow {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.iconMale {
  color: var(--color-male);
  font-size: 0.625rem;
}

.iconFemale {
  color: var(--color-female);
  font-size: 0.625rem;
}

.iconCar {
  color: var(--color-primary);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.assignBtn {
  margin-top: auto;
  padding: var(--space-2) var(--space-3);
  background: var(--color-primary-subtle);
  color: var(--color-primary-text);
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease;
  text-align: center;
}

.assignBtn:hover {
  background: var(--color-primary);
  color: #fff;
}

.assignBtn:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

- [ ] Run `npx tsc --noEmit`. Fix any errors.

- [ ] Navigate to `/search`, enter a name that exists, submit. Verify result cards render with thumbnail/placeholder, name, age, attribute tags, and "הוסף לסצנה" button.

- [ ] Commit:

```bash
git add src/components/search/SearchResults/
git commit -m "feat: add SearchResults component with extra cards"
```

---

### Task 7: ScenePicker Modal

**Files:**
- Create: `src/components/search/ScenePicker/index.tsx`
- Create: `src/components/search/ScenePicker/ScenePicker.module.css`

- [ ] Create `src/components/search/ScenePicker/index.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { assignExtra } from '@/actions/extra-scenes'
import Modal from '@/components/ui/Modal'
import type { SearchResult } from '@/actions/search'
import type { SceneContextData, PickerDay } from '@/actions/scenes'
import styles from './ScenePicker.module.css'

interface ScenePickerProps {
  extra: SearchResult
  sceneId?: number
  sceneContext?: SceneContextData
  pickerScenes: PickerDay[]
  onClose: () => void
}

export default function ScenePicker({
  extra,
  sceneId,
  sceneContext,
  pickerScenes,
  onClose,
}: ScenePickerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAssign(targetSceneId: number, shootingDayId: number) {
    startTransition(async () => {
      const result = await assignExtra(extra.id, targetSceneId)
      if ('error' in result) {
        toast.error(result.error)
        onClose()
        return
      }
      toast.success(`${extra.fullName} שובץ לסצנה`)
      router.push(`/shooting-days/${shootingDayId}`)
    })
  }

  // Mode A: single scene context
  if (sceneId && sceneContext) {
    const gap = Math.max(
      0,
      sceneContext.scene.requiredExtras - sceneContext.scene.assignedCount
    )
    const dateStr = formatDate(sceneContext.shootingDay.date)

    return (
      <Modal
        isOpen
        onClose={onClose}
        title={`שיבוץ: ${extra.fullName}`}
      >
        <div className={styles.sceneDetail}>
          <h3 className={styles.sceneTitle}>{sceneContext.scene.title}</h3>
          <p className={styles.sceneDate}>{dateStr}</p>
          {gap > 0 ? (
            <span className={styles.gapBadge}>
              חסרים {gap} מתוך {sceneContext.scene.requiredExtras}
            </span>
          ) : (
            <span className={styles.fullBadge}>מלא</span>
          )}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.assignBtn}
            onClick={() =>
              handleAssign(sceneId, sceneContext.shootingDay.id)
            }
            disabled={isPending}
          >
            {isPending ? 'משבץ...' : 'שבץ'}
          </button>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            type="button"
          >
            ביטול
          </button>
        </div>
      </Modal>
    )
  }

  // Mode B: all scenes
  return (
    <Modal isOpen onClose={onClose} title={`שיבוץ: ${extra.fullName}`}>
      {pickerScenes.length === 0 ? (
        <p className={styles.empty}>אין ימי צילום פעילים</p>
      ) : (
        <div className={styles.dayList}>
          {pickerScenes.map((pd) => (
            <div key={pd.shootingDay.id} className={styles.daySection}>
              <h3 className={styles.dayHeader}>
                {formatDate(pd.shootingDay.date)}
                {pd.shootingDay.title && (
                  <span className={styles.dayTitle}>
                    {' '}— {pd.shootingDay.title}
                  </span>
                )}
              </h3>

              {pd.scenes.length === 0 ? (
                <p className={styles.noScenes}>אין סצנות ביום זה</p>
              ) : (
                <div className={styles.sceneList}>
                  {pd.scenes.map((scene, idx) => {
                    const gap = Math.max(
                      0,
                      scene.requiredExtras - scene.assignedCount
                    )
                    // requiredExtras=0 means "unlimited" — never treat as full
                    const isFull = scene.requiredExtras > 0 && gap === 0

                    return (
                      <div
                        key={scene.id}
                        className={`${styles.sceneRow} ${
                          isFull ? styles.sceneRowFull : ''
                        }`}
                      >
                        <span className={styles.sceneNum}>
                          {idx + 1}
                        </span>
                        <span className={styles.sceneRowTitle}>
                          {scene.title}
                        </span>
                        {isFull ? (
                          <span className={styles.fullBadge}>מלא</span>
                        ) : (
                          <span className={styles.gapBadge}>
                            חסרים {gap}
                          </span>
                        )}
                        <button
                          className={styles.assignBtn}
                          onClick={() =>
                            handleAssign(scene.id, pd.shootingDay.id)
                          }
                          disabled={isFull || isPending}
                          aria-disabled={isFull}
                        >
                          שבץ
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function formatDate(dateStr: string): string {
  try {
    // date column returns YYYY-MM-DD string; parse without timezone shift
    const [year, month, day] = dateStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return format(d, 'EEEE, d בMMMM yyyy', { locale: he })
  } catch {
    return dateStr
  }
}
```

- [ ] Create `src/components/search/ScenePicker/ScenePicker.module.css`:

```css
/* Mode A scene detail */
.sceneDetail {
  padding: var(--space-3) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sceneTitle {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.sceneDate {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0;
}

/* Badges */
.gapBadge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
}

.fullBadge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  background: var(--color-success-subtle);
  color: var(--color-success);
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
}

/* Actions (Mode A) */
.actions {
  display: flex;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.assignBtn {
  flex: 1;
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.assignBtn:hover:not(:disabled) {
  background: var(--color-primary-light);
}

.assignBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancelBtn {
  padding: var(--space-2) var(--space-4);
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 150ms ease;
}

.cancelBtn:hover {
  border-color: var(--color-text-secondary);
}

/* Mode B: day list */
.dayList {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-height: 60vh;
  overflow-y: auto;
}

.daySection {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.dayHeader {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0;
}

.dayTitle {
  text-transform: none;
  font-weight: 500;
}

.noScenes {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0;
}

.sceneList {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sceneRow {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.sceneRow.sceneRowFull {
  opacity: 0.5;
}

.sceneNum {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--color-primary-subtle);
  color: var(--color-primary-text);
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.sceneRowTitle {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text);
}

.sceneRow .assignBtn {
  flex: none;
  padding: var(--space-1) var(--space-3);
  font-size: 0.8125rem;
}

.empty {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  text-align: center;
  padding: var(--space-8) 0;
  margin: 0;
}
```

- [ ] Run `npx tsc --noEmit`. Fix any errors.

- [ ] Navigate to `/search`, search for extras, click "הוסף לסצנה". Verify the ScenePicker modal opens. Test both Mode A (from `/search?sceneId=1`) and Mode B (from `/search`).

- [ ] Test the full assignment flow:
  1. Open `/shooting-days/{id}`
  2. Click "מצא ניצבים" on a scene
  3. Confirm URL is `/search?sceneId={sceneId}`
  4. Confirm context banner shows scene title
  5. Search for an extra, click "הוסף לסצנה"
  6. Confirm ScenePicker shows Mode A (single scene)
  7. Click "שבץ" → verify redirect to shooting day, extra appears in scene

- [ ] Test Mode B:
  1. Navigate to `/search` (no sceneId)
  2. Search for an extra, click "הוסף לסצנה"
  3. Verify Mode B shows all scenes grouped by day
  4. Fully cast scenes are grayed out with disabled button
  5. Click "שבץ" → verify redirect to correct shooting day

- [ ] Commit:

```bash
git add src/components/search/ScenePicker/
git commit -m "feat: add ScenePicker modal with Mode A and Mode B assignment"
```

---

## Chunk 4: Final Wiring & Verification

### Task 8: End-to-End Verification

- [ ] Run `npm run build` from the project root. Confirm it completes with no TypeScript or build errors.

- [ ] Acceptance criteria verification — check each item:

  - [ ] Search page renders filter controls with correct Hebrew labels
  - [ ] Attribute pills are multi-selectable; selected pills show filled border
  - [ ] Submitting filters returns correct results from DB
  - [ ] Filter params round-trip correctly — refresh page with filter params, form is pre-filled
  - [ ] `?sceneId` param is preserved when changing filters and re-submitting
  - [ ] Empty results state shows `Search` icon + "לא נמצאו ניצבים התואמים לחיפוש"
  - [ ] Initial state (no search) shows `Search` icon + "הגדר סינון וחפש ניצבים"
  - [ ] Navigating from "מצא ניצבים" shows context banner with scene title and × link
  - [ ] × button in context banner navigates back to correct shooting day
  - [ ] ScenePicker Mode A: assigns extra and redirects to shooting day
  - [ ] ScenePicker Mode B: shows all scenes grouped by day
  - [ ] Fully cast scenes in Mode B are disabled
  - [ ] Gap calculation uses `confirmed + arrived` only
  - [ ] Results show thumbnail or `UserCircle2` placeholder
  - [ ] Extras with no availability record excluded when date filter is active
  - [ ] "הוסף לסצנה" button hidden for guest-role users

- [ ] Mark Phase 7 as complete in `docs/CLAUDE_CODE_PHASES.md` (change `## Phase 7 — Search` to `## Phase 7 — Search ✅ DONE`).

- [ ] Commit:

```bash
git add docs/CLAUDE_CODE_PHASES.md
git commit -m "docs: mark Phase 7 as complete"
```
