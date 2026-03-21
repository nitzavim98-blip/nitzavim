# Phase 5: Shooting Days & Scenes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build full shooting day and scene management — list, create, edit, archive flow, detail page with draggable scene cards, and gap indicators.

**Architecture:** Three routes (list, detail, archive) plus one create route, backed by server actions. Scene drag reordering uses `@dnd-kit` client-side with a single batch `reorderScenes` server action to persist. The detail page is a server component that renders client-side `SortableSceneList` and `ShootingDayHeader` wrappers. All mutations return `{ data } | { error }` and call `revalidatePath`. Gap calculation in Phase 5 hardcodes `assignedCount = 0` (Phase 6 fills this with real `extra_scenes` data).

**Tech Stack:** Next.js 14 App Router, Drizzle ORM + Neon, CSS Modules, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`, `lucide-react`, `date-fns` + Hebrew locale, `react-hot-toast`, existing `Button` and `Modal` UI components.

---

## File Map

| File | Type | Purpose |
|------|------|---------|
| `src/lib/validations/shooting-day.ts` | New | Zod schemas for shooting day create/update |
| `src/lib/validations/scene.ts` | New | Zod schemas for scene create/update |
| `src/actions/shooting-days.ts` | New | Server actions: getShootingDays, getShootingDay, createShootingDay, updateShootingDay, archiveShootingDay, getArchivedShootingDays |
| `src/actions/scenes.ts` | New | Server actions: getScenes, createScene, updateScene, deleteScene, reorderScenes |
| `src/components/shooting-days/ShootingDayCard/index.tsx` | New | List card: date, title, scene count, gap chip |
| `src/components/shooting-days/ShootingDayCard/ShootingDayCard.module.css` | New | Card styles |
| `src/components/shooting-days/ShootingDayForm/index.tsx` | New | Create/edit form (used standalone + in modal) |
| `src/components/shooting-days/ShootingDayForm/ShootingDayForm.module.css` | New | Form styles |
| `src/components/shooting-days/ShootingDayHeader/index.tsx` | New | Client component: date, title, edit/archive buttons |
| `src/components/shooting-days/ShootingDayHeader/ShootingDayHeader.module.css` | New | Header styles |
| `src/components/shooting-days/SceneForm/index.tsx` | New | Create/edit scene form (used in modal) |
| `src/components/shooting-days/SceneForm/SceneForm.module.css` | New | Form styles |
| `src/components/shooting-days/SceneBlock/index.tsx` | New | Draggable scene card with edit/delete |
| `src/components/shooting-days/SceneBlock/SceneBlock.module.css` | New | Scene card styles |
| `src/components/shooting-days/SortableSceneList/index.tsx` | New | dnd-kit context + sortable wrapper |
| `src/components/shooting-days/SortableSceneList/SortableSceneList.module.css` | New | List styles |
| `src/components/shooting-days/AddSceneButton/index.tsx` | New | Button + modal to add a new scene |
| `src/components/shooting-days/AddSceneButton/AddSceneButton.module.css` | New | Button styles |
| `src/app/(dashboard)/shooting-days/page.tsx` | New | Shooting days list (server component) |
| `src/app/(dashboard)/shooting-days/shooting-days.module.css` | New | List page styles |
| `src/app/(dashboard)/shooting-days/new/page.tsx` | New | Create new shooting day page |
| `src/app/(dashboard)/shooting-days/new/new-shooting-day.module.css` | New | New page styles |
| `src/app/(dashboard)/shooting-days/[id]/page.tsx` | New | Shooting day detail page (server component) |
| `src/app/(dashboard)/shooting-days/[id]/shooting-day-detail.module.css` | New | Detail page styles |
| `src/app/(dashboard)/shooting-days/archive/page.tsx` | New | Archive list (server component, read-only) |
| `src/app/(dashboard)/shooting-days/archive/archive.module.css` | New | Archive page styles |

---

## Chunk 1: Foundation — Dependencies, Schemas, Server Actions

### Task 1: Install dnd-kit

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/royporat/repos/my_repos/for_nitzavim/nitzavim
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: Clean install with no peer dependency warnings.

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit for scene drag-and-drop reordering"
```

---

### Task 2: Shooting Day Zod Schemas

**Files:**
- Create: `src/lib/validations/shooting-day.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/validations/shooting-day.ts
import { z } from 'zod'

export const createShootingDaySchema = z.object({
  date: z.string().min(1, 'תאריך הוא שדה חובה'),
  title: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  notes: z.string().optional(),
})

export const updateShootingDaySchema = z.object({
  id: z.number().int().positive(),
  date: z.string().min(1).optional(),
  title: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  notes: z.string().optional(),
})

export type CreateShootingDayInput = z.infer<typeof createShootingDaySchema>
export type UpdateShootingDayInput = z.infer<typeof updateShootingDaySchema>
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

### Task 3: Scene Zod Schemas

**Files:**
- Create: `src/lib/validations/scene.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/validations/scene.ts
import { z } from 'zod'

export const createSceneSchema = z.object({
  shootingDayId: z.number().int().positive(),
  title: z.string().min(1, 'שם הסצנה הוא שדה חובה').max(255),
  description: z.string().optional(),
  requiredExtras: z.number().int().min(0).default(0),
})

export const updateSceneSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  requiredExtras: z.number().int().min(0).optional(),
})

export type CreateSceneInput = z.infer<typeof createSceneSchema>
export type UpdateSceneInput = z.infer<typeof updateSceneSchema>
```

- [ ] **Step 2: Commit schemas**

```bash
git add src/lib/validations/
git commit -m "feat: add Zod schemas for shooting days and scenes"
```

---

### Task 4: Shooting Days Server Actions

**Files:**
- Create: `src/actions/shooting-days.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/actions/shooting-days.ts
'use server'

import { db } from '@/db'
import { shootingDays } from '@/db/schema/shooting-days'
import { scenes } from '@/db/schema/scenes'
import { and, eq, asc, desc, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentProduction, requireAuth } from './auth'
import {
  createShootingDaySchema,
  updateShootingDaySchema,
} from '@/lib/validations/shooting-day'

// Helper: given a list of shooting days, fetch their scene stats.
// Phase 5: assignedCount is always 0 (no extra_scenes data yet).
async function attachStats(days: (typeof shootingDays.$inferSelect)[]) {
  if (days.length === 0) return []

  const allScenes = await db
    .select()
    .from(scenes)
    .where(inArray(scenes.shootingDayId, days.map((d) => d.id)))

  return days.map((day) => {
    const dayScenes = allScenes.filter((s) => s.shootingDayId === day.id)
    const totalRequired = dayScenes.reduce((sum, s) => sum + s.requiredExtras, 0)
    const totalAssigned = 0 // Phase 5: no extra_scenes yet
    const totalGap = Math.max(0, totalRequired - totalAssigned)
    return {
      ...day,
      sceneCount: dayScenes.length,
      totalRequiredExtras: totalRequired,
      totalAssignedExtras: totalAssigned,
      totalGap,
    }
  })
}

export async function getShootingDays() {
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

  return { data: await attachStats(days) }
}

export async function getShootingDay(id: number) {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const result = await db
    .select()
    .from(shootingDays)
    .where(
      and(
        eq(shootingDays.id, id),
        eq(shootingDays.productionId, production.id)
      )
    )
    .limit(1)

  if (!result[0]) return { error: 'יום הצילום לא נמצא' }
  return { data: result[0] }
}

export async function createShootingDay(input: unknown) {
  await requireAuth()
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const parsed = createShootingDaySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const [created] = await db
    .insert(shootingDays)
    .values({ ...parsed.data, productionId: production.id })
    .returning()

  revalidatePath('/shooting-days')
  return { data: created }
}

export async function updateShootingDay(input: unknown) {
  await requireAuth()
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const parsed = updateShootingDaySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { id, ...fields } = parsed.data

  const [updated] = await db
    .update(shootingDays)
    .set({ ...fields, updatedAt: new Date() })
    .where(
      and(
        eq(shootingDays.id, id),
        eq(shootingDays.productionId, production.id)
      )
    )
    .returning()

  if (!updated) return { error: 'יום הצילום לא נמצא' }
  revalidatePath('/shooting-days')
  revalidatePath(`/shooting-days/${id}`)
  return { data: updated }
}

export async function archiveShootingDay(id: number) {
  await requireAuth()
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const [updated] = await db
    .update(shootingDays)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(
      and(
        eq(shootingDays.id, id),
        eq(shootingDays.productionId, production.id)
      )
    )
    .returning()

  if (!updated) return { error: 'יום הצילום לא נמצא' }
  revalidatePath('/shooting-days')
  revalidatePath('/shooting-days/archive')
  return { data: updated }
}

export async function getArchivedShootingDays() {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const days = await db
    .select()
    .from(shootingDays)
    .where(
      and(
        eq(shootingDays.productionId, production.id),
        eq(shootingDays.isArchived, true)
      )
    )
    .orderBy(desc(shootingDays.date))

  return { data: await attachStats(days) }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

### Task 5: Scenes Server Actions

**Files:**
- Create: `src/actions/scenes.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/actions/scenes.ts
'use server'

import { db } from '@/db'
import { scenes } from '@/db/schema/scenes'
import { shootingDays } from '@/db/schema/shooting-days'
import { and, eq, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentProduction, requireAuth } from './auth'
import { createSceneSchema, updateSceneSchema } from '@/lib/validations/scene'

export async function getScenes(shootingDayId: number) {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  // Verify the shooting day belongs to this production
  const day = await db
    .select()
    .from(shootingDays)
    .where(
      and(
        eq(shootingDays.id, shootingDayId),
        eq(shootingDays.productionId, production.id)
      )
    )
    .limit(1)

  if (!day[0]) return { error: 'יום הצילום לא נמצא' }

  const result = await db
    .select()
    .from(scenes)
    .where(eq(scenes.shootingDayId, shootingDayId))
    .orderBy(asc(scenes.sortOrder))

  return { data: result }
}

export async function createScene(input: unknown) {
  await requireAuth()
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const parsed = createSceneSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  // Verify ownership
  const day = await db
    .select()
    .from(shootingDays)
    .where(
      and(
        eq(shootingDays.id, parsed.data.shootingDayId),
        eq(shootingDays.productionId, production.id)
      )
    )
    .limit(1)

  if (!day[0]) return { error: 'יום הצילום לא נמצא' }

  // Compute next sortOrder
  const existing = await db
    .select({ sortOrder: scenes.sortOrder })
    .from(scenes)
    .where(eq(scenes.shootingDayId, parsed.data.shootingDayId))
    .orderBy(asc(scenes.sortOrder))

  const nextOrder =
    existing.length > 0
      ? Math.max(...existing.map((s) => s.sortOrder)) + 1
      : 0

  const [created] = await db
    .insert(scenes)
    .values({ ...parsed.data, sortOrder: nextOrder })
    .returning()

  revalidatePath(`/shooting-days/${parsed.data.shootingDayId}`)
  return { data: created }
}

export async function updateScene(input: unknown) {
  await requireAuth()

  const parsed = updateSceneSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { id, ...fields } = parsed.data

  const [updated] = await db
    .update(scenes)
    .set(fields)
    .where(eq(scenes.id, id))
    .returning()

  if (!updated) return { error: 'הסצנה לא נמצאה' }
  revalidatePath(`/shooting-days/${updated.shootingDayId}`)
  return { data: updated }
}

export async function deleteScene(id: number) {
  await requireAuth()

  const scene = await db
    .select()
    .from(scenes)
    .where(eq(scenes.id, id))
    .limit(1)

  if (!scene[0]) return { error: 'הסצנה לא נמצאה' }

  await db.delete(scenes).where(eq(scenes.id, id))
  revalidatePath(`/shooting-days/${scene[0].shootingDayId}`)
  return { data: { success: true } }
}

export async function reorderScenes(shootingDayId: number, orderedIds: number[]) {
  await requireAuth()

  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(scenes).set({ sortOrder: index }).where(eq(scenes.id, id))
    )
  )

  revalidatePath(`/shooting-days/${shootingDayId}`)
  return { data: { success: true } }
}
```

- [ ] **Step 2: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/actions/
git commit -m "feat: add server actions for shooting days and scenes"
```

---

## Chunk 2: Components

### Task 6: ShootingDayCard Component

**Files:**
- Create: `src/components/shooting-days/ShootingDayCard/index.tsx`
- Create: `src/components/shooting-days/ShootingDayCard/ShootingDayCard.module.css`

- [ ] **Step 1: Create index.tsx**

```typescript
// src/components/shooting-days/ShootingDayCard/index.tsx
import Link from 'next/link'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { CalendarDays, Film, Users, AlertCircle } from 'lucide-react'
import styles from './ShootingDayCard.module.css'

type Props = {
  id: number
  date: string
  title?: string | null
  location?: string | null
  sceneCount: number
  totalRequiredExtras: number
  totalAssignedExtras: number
  totalGap: number
  isArchived?: boolean
}

export default function ShootingDayCard({
  id,
  date,
  title,
  location,
  sceneCount,
  totalRequiredExtras,
  totalAssignedExtras,
  totalGap,
  isArchived,
}: Props) {
  // date from DB is a string like "2026-03-17"; parse as UTC to avoid TZ shift
  const parsedDate = new Date(date + 'T00:00:00')
  const formattedDate = format(parsedDate, 'EEEE, d בMMMM yyyy', { locale: he })

  return (
    <Link href={`/shooting-days/${id}`} className={styles.card}>
      <div className={styles.header}>
        <div className={styles.dateRow}>
          <CalendarDays size={16} className={styles.dateIcon} />
          <span className={styles.date}>{formattedDate}</span>
        </div>
        {title && <h3 className={styles.title}>{title}</h3>}
        {location && <span className={styles.location}>📍 {location}</span>}
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <Film size={14} />
          <span>{sceneCount} סצנות</span>
        </div>
        <div className={styles.stat}>
          <Users size={14} />
          <span>
            {totalAssignedExtras}/{totalRequiredExtras} ניצבים
          </span>
        </div>
        {totalGap > 0 && !isArchived && (
          <div className={styles.gapChip}>
            <AlertCircle size={12} />
            <span>חסרים {totalGap} ניצבים</span>
          </div>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create ShootingDayCard.module.css**

```css
/* src/components/shooting-days/ShootingDayCard/ShootingDayCard.module.css */
.card {
  display: block;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: var(--space-4);
  text-decoration: none;
  color: inherit;
  transition: border-color 150ms ease, background-color 150ms ease;
}

.card:hover {
  border-color: var(--color-primary-light);
  background: var(--color-card-hover);
}

.header {
  margin-block-end: var(--space-3);
}

.dateRow {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-block-end: var(--space-2);
}

.dateIcon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.date {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
}

.title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-1) 0;
}

.location {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stats {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.gapChip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 100px;
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  font-size: 0.75rem;
  font-weight: 500;
  margin-inline-start: auto;
}
```

---

### Task 7: ShootingDayForm Component

**Files:**
- Create: `src/components/shooting-days/ShootingDayForm/index.tsx`
- Create: `src/components/shooting-days/ShootingDayForm/ShootingDayForm.module.css`

- [ ] **Step 1: Create index.tsx**

```typescript
// src/components/shooting-days/ShootingDayForm/index.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createShootingDay, updateShootingDay } from '@/actions/shooting-days'
import Button from '@/components/ui/Button'
import styles from './ShootingDayForm.module.css'

type InitialData = {
  id: number
  date: string
  title?: string | null
  location?: string | null
  notes?: string | null
}

type Props = {
  initialData?: InitialData
  onSuccess?: () => void
}

export default function ShootingDayForm({ initialData, onSuccess }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const input = {
      date: formData.get('date') as string,
      title: (formData.get('title') as string) || undefined,
      location: (formData.get('location') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    }

    startTransition(async () => {
      const result = initialData
        ? await updateShootingDay({ ...input, id: initialData.id })
        : await createShootingDay(input)

      if ('error' in result) {
        toast.error(result.error)
        return
      }

      toast.success(initialData ? 'יום הצילום עודכן' : 'יום הצילום נוצר')

      if (onSuccess) {
        onSuccess()
      } else if (!initialData) {
        router.push(`/shooting-days/${result.data.id}`)
      } else {
        router.push(`/shooting-days/${initialData.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="sd-date" className={styles.label}>
          תאריך *
        </label>
        <input
          type="date"
          id="sd-date"
          name="date"
          required
          defaultValue={initialData?.date}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="sd-title" className={styles.label}>
          כותרת
        </label>
        <input
          type="text"
          id="sd-title"
          name="title"
          defaultValue={initialData?.title ?? ''}
          placeholder="כותרת יום הצילום (אופציונלי)"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="sd-location" className={styles.label}>
          מיקום
        </label>
        <input
          type="text"
          id="sd-location"
          name="location"
          defaultValue={initialData?.location ?? ''}
          placeholder="מיקום הצילום (אופציונלי)"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="sd-notes" className={styles.label}>
          הערות
        </label>
        <textarea
          id="sd-notes"
          name="notes"
          defaultValue={initialData?.notes ?? ''}
          placeholder="הערות לצוות..."
          rows={4}
          className={styles.textarea}
        />
      </div>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => (onSuccess ? onSuccess() : router.back())}
          disabled={isPending}
        >
          ביטול
        </Button>
        <Button type="submit" variant="primary" loading={isPending}>
          {initialData ? 'שמור שינויים' : 'צור יום צילום'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create ShootingDayForm.module.css**

```css
/* src/components/shooting-days/ShootingDayForm/ShootingDayForm.module.css */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.input,
.textarea {
  width: 100%;
  padding: 10px var(--space-3);
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--color-text);
  background: var(--color-card);
  font-family: inherit;
  transition: border-color 150ms ease;
  box-sizing: border-box;
}

.input:focus,
.textarea:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-color: var(--color-primary);
}

.textarea {
  resize: vertical;
}

.actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding-block-start: var(--space-2);
}
```

---

### Task 8: SceneForm Component

**Files:**
- Create: `src/components/shooting-days/SceneForm/index.tsx`
- Create: `src/components/shooting-days/SceneForm/SceneForm.module.css`

- [ ] **Step 1: Create index.tsx**

```typescript
// src/components/shooting-days/SceneForm/index.tsx
'use client'

import { useTransition } from 'react'
import toast from 'react-hot-toast'
import { createScene, updateScene } from '@/actions/scenes'
import Button from '@/components/ui/Button'
import type { Scene } from '@/db/schema/scenes'
import styles from './SceneForm.module.css'

type Props = {
  shootingDayId: number
  scene?: Scene
  onSuccess: () => void
  onCancel: () => void
}

export default function SceneForm({ shootingDayId, scene, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const input = scene
      ? {
          id: scene.id,
          title: formData.get('title') as string,
          description: (formData.get('description') as string) || undefined,
          requiredExtras: Number(formData.get('requiredExtras')) || 0,
        }
      : {
          shootingDayId,
          title: formData.get('title') as string,
          description: (formData.get('description') as string) || undefined,
          requiredExtras: Number(formData.get('requiredExtras')) || 0,
        }

    startTransition(async () => {
      const result = scene ? await updateScene(input) : await createScene(input)

      if ('error' in result) {
        toast.error(result.error)
        return
      }

      toast.success(scene ? 'הסצנה עודכנה' : 'הסצנה נוצרה')
      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="scene-title" className={styles.label}>
          שם הסצנה *
        </label>
        <input
          type="text"
          id="scene-title"
          name="title"
          required
          defaultValue={scene?.title ?? ''}
          placeholder="שם הסצנה"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="scene-description" className={styles.label}>
          תיאור
        </label>
        <textarea
          id="scene-description"
          name="description"
          defaultValue={scene?.description ?? ''}
          placeholder="תיאור הסצנה, לוק, מצב..."
          rows={3}
          className={styles.textarea}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="scene-required" className={styles.label}>
          מספר ניצבים נדרש
        </label>
        <input
          type="number"
          id="scene-required"
          name="requiredExtras"
          min="0"
          defaultValue={scene?.requiredExtras ?? 0}
          className={styles.input}
        />
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
          ביטול
        </Button>
        <Button type="submit" variant="primary" loading={isPending}>
          {scene ? 'שמור שינויים' : 'הוסף סצנה'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create SceneForm.module.css**

```css
/* src/components/shooting-days/SceneForm/SceneForm.module.css */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.input,
.textarea {
  width: 100%;
  padding: 10px var(--space-3);
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--color-text);
  background: var(--color-card);
  font-family: inherit;
  transition: border-color 150ms ease;
  box-sizing: border-box;
}

.input:focus,
.textarea:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-color: var(--color-primary);
}

.textarea {
  resize: vertical;
}

.actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding-block-start: var(--space-2);
}
```

---

### Task 9: AddSceneButton Component

**Files:**
- Create: `src/components/shooting-days/AddSceneButton/index.tsx`
- Create: `src/components/shooting-days/AddSceneButton/AddSceneButton.module.css`

- [ ] **Step 1: Create index.tsx**

```typescript
// src/components/shooting-days/AddSceneButton/index.tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import SceneForm from '@/components/shooting-days/SceneForm'
import styles from './AddSceneButton.module.css'

type Props = {
  shootingDayId: number
}

export default function AddSceneButton({ shootingDayId }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        <Plus size={16} />
        הוסף סצנה
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="סצנה חדשה">
        <SceneForm
          shootingDayId={shootingDayId}
          onSuccess={() => setIsOpen(false)}
          onCancel={() => setIsOpen(false)}
        />
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Create AddSceneButton.module.css**

```css
/* src/components/shooting-days/AddSceneButton/AddSceneButton.module.css */
/* Styles applied via Button component — no extra classes needed */
```

---

### Task 10: SceneBlock Component

**Files:**
- Create: `src/components/shooting-days/SceneBlock/index.tsx`
- Create: `src/components/shooting-days/SceneBlock/SceneBlock.module.css`

- [ ] **Step 1: Create index.tsx**

```typescript
// src/components/shooting-days/SceneBlock/index.tsx
'use client'

import { useState, useTransition } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Pencil,
  Trash2,
  Users,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { deleteScene } from '@/actions/scenes'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import SceneForm from '@/components/shooting-days/SceneForm'
import type { Scene } from '@/db/schema/scenes'
import styles from './SceneBlock.module.css'

type Props = {
  scene: Scene
  sceneNumber: number
  assignedCount?: number
  isReadOnly?: boolean
}

export default function SceneBlock({
  scene,
  sceneNumber,
  assignedCount = 0,
  isReadOnly,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id, disabled: isReadOnly })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const gap = Math.max(0, scene.requiredExtras - assignedCount)
  const isFull = scene.requiredExtras > 0 && gap === 0

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteScene(scene.id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('הסצנה נמחקה')
      setConfirmDelete(false)
    })
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`${styles.block} ${isDragging ? styles.dragging : ''}`}
      >
        <div className={styles.row}>
          {!isReadOnly && (
            <button
              className={styles.dragHandle}
              aria-label="גרור לשינוי סדר"
              {...attributes}
              {...listeners}
            >
              <GripVertical size={18} />
            </button>
          )}

          <div className={styles.sceneBadge}>
            <span className={styles.sceneNumber}>סצנה {sceneNumber}</span>
          </div>

          <div className={styles.content}>
            <h3 className={styles.title}>{scene.title}</h3>
            {scene.description && (
              <p className={styles.description}>{scene.description}</p>
            )}
          </div>

          <div className={styles.side}>
            {scene.requiredExtras > 0 && (
              <div
                className={`${styles.gapIndicator} ${
                  isFull ? styles.full : styles.missing
                }`}
              >
                {isFull ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>
                      {assignedCount}/{scene.requiredExtras} ניצבים
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} />
                    <span>
                      חסרים {gap}/{scene.requiredExtras} ניצבים
                    </span>
                  </>
                )}
              </div>
            )}

            {!isReadOnly && (
              <div className={styles.actions}>
                <button
                  className={styles.actionButton}
                  onClick={() => setIsEditing(true)}
                  aria-label="ערוך סצנה"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => setConfirmDelete(true)}
                  aria-label="מחק סצנה"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Phase 5 placeholder — extras grid goes here in Phase 6 */}
        <div className={styles.extrasPlaceholder}>
          <Users size={14} className={styles.placeholderIcon} />
          <span>הוסף ניצבים לסצנה</span>
        </div>
      </div>

      {/* Edit modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="עריכת סצנה">
        <SceneForm
          shootingDayId={scene.shootingDayId}
          scene={scene}
          onSuccess={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="מחיקת סצנה"
      >
        <p className={styles.confirmText}>
          האם למחוק את הסצנה &ldquo;{scene.title}&rdquo;?
        </p>
        <p className={styles.confirmSubtext}>פעולה זו אינה ניתנת לביטול</p>
        <div className={styles.confirmActions}>
          <Button
            variant="secondary"
            onClick={() => setConfirmDelete(false)}
            disabled={isDeleting}
          >
            ביטול
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
            מחק
          </Button>
        </div>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Create SceneBlock.module.css**

```css
/* src/components/shooting-days/SceneBlock/SceneBlock.module.css */
.block {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.block.dragging {
  cursor: grabbing;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
}

.dragHandle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: grab;
  color: var(--color-text-muted);
  flex-shrink: 0;
  border-radius: 4px;
  transition: color 150ms ease, background 150ms ease;
}

.dragHandle:hover {
  color: var(--color-text-secondary);
  background: var(--color-bg);
}

.dragHandle:active {
  cursor: grabbing;
}

.sceneBadge {
  flex-shrink: 0;
}

.sceneNumber {
  display: inline-block;
  padding: 3px 10px;
  background: var(--color-primary-subtle);
  color: var(--color-primary-text);
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.content {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 2px 0;
}

.description {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.side {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.gapIndicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 500;
}

.gapIndicator.missing {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.gapIndicator.full {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.actions {
  display: flex;
  gap: var(--space-1);
}

.actionButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: 6px;
  transition: color 150ms ease, background 150ms ease;
}

.actionButton:hover {
  color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.actionButton.deleteButton:hover {
  color: var(--color-danger);
  background: var(--color-danger-subtle);
}

.extrasPlaceholder {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg);
  border-block-start: 1px solid var(--color-border);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.placeholderIcon {
  flex-shrink: 0;
}

/* Confirmation modal content */
.confirmText {
  font-size: 0.9375rem;
  color: var(--color-text);
  margin: 0 0 var(--space-2) 0;
}

.confirmSubtext {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-6) 0;
}

.confirmActions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}
```

---

### Task 11: SortableSceneList Component

**Files:**
- Create: `src/components/shooting-days/SortableSceneList/index.tsx`
- Create: `src/components/shooting-days/SortableSceneList/SortableSceneList.module.css`

- [ ] **Step 1: Create index.tsx**

```typescript
// src/components/shooting-days/SortableSceneList/index.tsx
'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import toast from 'react-hot-toast'
import { reorderScenes } from '@/actions/scenes'
import SceneBlock from '@/components/shooting-days/SceneBlock'
import type { Scene } from '@/db/schema/scenes'
import styles from './SortableSceneList.module.css'

type Props = {
  scenes: Scene[]
  shootingDayId: number
  isReadOnly?: boolean
}

export default function SortableSceneList({
  scenes: initialScenes,
  shootingDayId,
  isReadOnly,
}: Props) {
  const [sceneList, setSceneList] = useState(initialScenes)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sceneList.findIndex((s) => s.id === active.id)
    const newIndex = sceneList.findIndex((s) => s.id === over.id)
    const newOrder = arrayMove(sceneList, oldIndex, newIndex)

    setSceneList(newOrder) // optimistic update

    const result = await reorderScenes(shootingDayId, newOrder.map((s) => s.id))
    if ('error' in result) {
      setSceneList(initialScenes) // rollback
      toast.error('שגיאה בשמירת הסדר')
    }
  }

  if (sceneList.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>אין סצנות ליום זה. הוסף סצנה ראשונה.</p>
      </div>
    )
  }

  if (isReadOnly) {
    return (
      <div className={styles.list}>
        {sceneList.map((scene, index) => (
          <SceneBlock
            key={scene.id}
            scene={scene}
            sceneNumber={index + 1}
            isReadOnly
          />
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sceneList.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.list}>
          {sceneList.map((scene, index) => (
            <SceneBlock
              key={scene.id}
              scene={scene}
              sceneNumber={index + 1}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

- [ ] **Step 2: Create SortableSceneList.module.css**

```css
/* src/components/shooting-days/SortableSceneList/SortableSceneList.module.css */
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-4);
  background: var(--color-card);
  border: 1px dashed var(--color-border);
  border-radius: 12px;
}

.emptyText {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
  text-align: center;
}
```

---

### Task 12: ShootingDayHeader Component

**Files:**
- Create: `src/components/shooting-days/ShootingDayHeader/index.tsx`
- Create: `src/components/shooting-days/ShootingDayHeader/ShootingDayHeader.module.css`

- [ ] **Step 1: Create index.tsx**

```typescript
// src/components/shooting-days/ShootingDayHeader/index.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Pencil, Archive, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { archiveShootingDay } from '@/actions/shooting-days'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ShootingDayForm from '@/components/shooting-days/ShootingDayForm'
import type { ShootingDay } from '@/db/schema/shooting-days'
import styles from './ShootingDayHeader.module.css'

type Props = {
  day: ShootingDay
}

export default function ShootingDayHeader({ day }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [isArchiving, startArchiveTransition] = useTransition()

  const parsedDate = new Date(day.date + 'T00:00:00')
  const formattedDate = format(parsedDate, 'EEEE, d בMMMM yyyy', { locale: he })

  function handleArchive() {
    startArchiveTransition(async () => {
      const result = await archiveShootingDay(day.id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('יום הצילום הועבר לארכיון')
      router.push('/shooting-days/archive')
    })
  }

  return (
    <>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <h1 className={styles.date}>{formattedDate}</h1>

          {day.isArchived ? (
            <span className={styles.archivedBadge}>ארכיון</span>
          ) : (
            <div className={styles.headerActions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                aria-label="ערוך יום צילום"
              >
                <Pencil size={16} />
                עריכה
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmArchive(true)}
                aria-label="העבר לארכיון"
              >
                <Archive size={16} />
                ארכיון
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled
                title="ייצוא לווצאפ — יהיה זמין בשלב 6"
                aria-label="ייצוא לווצאפ"
              >
                <MessageSquare size={16} />
                ייצוא לווצאפ
              </Button>
            </div>
          )}
        </div>

        {day.title && <h2 className={styles.title}>{day.title}</h2>}
        {day.location && (
          <p className={styles.location}>📍 {day.location}</p>
        )}
        {day.notes && <p className={styles.notes}>{day.notes}</p>}
      </div>

      {/* Edit modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="עריכת יום צילום">
        <ShootingDayForm
          initialData={day}
          onSuccess={() => setIsEditing(false)}
        />
      </Modal>

      {/* Archive confirmation modal */}
      <Modal
        isOpen={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="ארכיון יום צילום"
      >
        <p className={styles.confirmText}>האם להעביר את יום הצילום לארכיון?</p>
        <p className={styles.confirmSubtext}>
          לאחר העברה, יום הצילום יהיה בקריאה בלבד
        </p>
        <div className={styles.confirmActions}>
          <Button
            variant="secondary"
            onClick={() => setConfirmArchive(false)}
            disabled={isArchiving}
          >
            ביטול
          </Button>
          <Button variant="danger" onClick={handleArchive} loading={isArchiving}>
            העבר לארכיון
          </Button>
        </div>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Create ShootingDayHeader.module.css**

```css
/* src/components/shooting-days/ShootingDayHeader/ShootingDayHeader.module.css */
.header {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: var(--space-4) var(--space-6);
  margin-block-end: var(--space-6);
}

.topRow {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-block-end: var(--space-3);
}

.date {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  flex: 1;
}

.archivedBadge {
  display: inline-block;
  padding: 3px 10px;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.headerActions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-2) 0;
}

.location {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-2) 0;
}

.notes {
  font-size: 0.875rem;
  color: var(--color-text);
  margin: 0;
  white-space: pre-wrap;
  background: var(--color-bg);
  padding: var(--space-3);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.confirmText {
  font-size: 0.9375rem;
  color: var(--color-text);
  margin: 0 0 var(--space-2) 0;
}

.confirmSubtext {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-6) 0;
}

.confirmActions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .topRow {
    flex-direction: column;
    align-items: flex-start;
  }

  .headerActions {
    width: 100%;
  }
}
```

- [ ] **Step 3: Commit all components**

```bash
git add src/components/shooting-days/
git commit -m "feat: add shooting day and scene UI components"
```

---

## Chunk 3: Pages

### Task 13: Shooting Days List Page

**Files:**
- Create: `src/app/(dashboard)/shooting-days/page.tsx`
- Create: `src/app/(dashboard)/shooting-days/shooting-days.module.css`

- [ ] **Step 1: Create page.tsx**

```typescript
// src/app/(dashboard)/shooting-days/page.tsx
import Link from 'next/link'
import { Plus, CalendarX } from 'lucide-react'
import { getShootingDays } from '@/actions/shooting-days'
import ShootingDayCard from '@/components/shooting-days/ShootingDayCard'
import Button from '@/components/ui/Button'
import styles from './shooting-days.module.css'

export default async function ShootingDaysPage() {
  const result = await getShootingDays()

  if ('error' in result) {
    return <p className={styles.errorText}>{result.error}</p>
  }

  const days = result.data

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ימי צילום</h1>
        <Link href="/shooting-days/new">
          <Button variant="primary">
            <Plus size={16} />
            יום צילום חדש
          </Button>
        </Link>
      </div>

      {days.length === 0 ? (
        <div className={styles.empty}>
          <CalendarX size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>אין ימי צילום קרובים</p>
          <Link href="/shooting-days/new">
            <Button variant="primary">
              <Plus size={16} />
              הוסף יום צילום ראשון
            </Button>
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {days.map((day) => (
            <ShootingDayCard key={day.id} {...day} />
          ))}
        </div>
      )}

      <div className={styles.archiveLinkRow}>
        <Link href="/shooting-days/archive" className={styles.archiveLink}>
          צפה בארכיון ימי הצילום
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create shooting-days.module.css**

```css
/* src/app/(dashboard)/shooting-days/shooting-days.module.css */
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-12) var(--space-4);
  text-align: center;
}

.emptyIcon {
  color: var(--color-text-muted);
}

.emptyText {
  font-size: 1rem;
  color: var(--color-text-muted);
  margin: 0;
}

.archiveLinkRow {
  display: flex;
  justify-content: center;
  padding-block-start: var(--space-4);
  border-block-start: 1px solid var(--color-border);
}

.archiveLink {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-decoration: underline;
  transition: color 150ms ease;
}

.archiveLink:hover {
  color: var(--color-primary);
}

.errorText {
  color: var(--color-danger);
  font-size: 0.875rem;
}
```

---

### Task 14: New Shooting Day Page

**Files:**
- Create: `src/app/(dashboard)/shooting-days/new/page.tsx`
- Create: `src/app/(dashboard)/shooting-days/new/new-shooting-day.module.css`

- [ ] **Step 1: Create page.tsx**

```typescript
// src/app/(dashboard)/shooting-days/new/page.tsx
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
```

- [ ] **Step 2: Create new-shooting-day.module.css**

```css
/* src/app/(dashboard)/shooting-days/new/new-shooting-day.module.css */
.page {
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.nav {
  margin-block-end: calc(-1 * var(--space-3));
}

.backLink {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 150ms ease;
}

.backLink:hover {
  color: var(--color-primary);
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.formCard {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: var(--space-6);
}
```

---

### Task 15: Shooting Day Detail Page

**Files:**
- Create: `src/app/(dashboard)/shooting-days/[id]/page.tsx`
- Create: `src/app/(dashboard)/shooting-days/[id]/shooting-day-detail.module.css`

- [ ] **Step 1: Create page.tsx**

```typescript
// src/app/(dashboard)/shooting-days/[id]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getShootingDay } from '@/actions/shooting-days'
import { getScenes } from '@/actions/scenes'
import ShootingDayHeader from '@/components/shooting-days/ShootingDayHeader'
import SortableSceneList from '@/components/shooting-days/SortableSceneList'
import AddSceneButton from '@/components/shooting-days/AddSceneButton'
import styles from './shooting-day-detail.module.css'

export default async function ShootingDayDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const id = Number(params.id)
  if (isNaN(id)) notFound()

  const [dayResult, scenesResult] = await Promise.all([
    getShootingDay(id),
    getScenes(id),
  ])

  if ('error' in dayResult) notFound()
  if ('error' in scenesResult) notFound()

  const day = dayResult.data
  const sceneList = scenesResult.data

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <Link href="/shooting-days" className={styles.backLink}>
          <ArrowRight size={16} />
          ימי צילום
        </Link>
      </div>

      <ShootingDayHeader day={day} />

      <div className={styles.sceneSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>סצנות</h2>
          {!day.isArchived && <AddSceneButton shootingDayId={day.id} />}
        </div>
        <SortableSceneList
          scenes={sceneList}
          shootingDayId={day.id}
          isReadOnly={day.isArchived}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create shooting-day-detail.module.css**

```css
/* src/app/(dashboard)/shooting-days/[id]/shooting-day-detail.module.css */
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.nav {
  margin-block-end: calc(-1 * var(--space-3));
}

.backLink {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 150ms ease;
}

.backLink:hover {
  color: var(--color-primary);
}

.sceneSection {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.sectionTitle {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}
```

---

### Task 16: Archive Page

**Files:**
- Create: `src/app/(dashboard)/shooting-days/archive/page.tsx`
- Create: `src/app/(dashboard)/shooting-days/archive/archive.module.css`

- [ ] **Step 1: Create page.tsx**

```typescript
// src/app/(dashboard)/shooting-days/archive/page.tsx
import Link from 'next/link'
import { Archive, ArrowRight } from 'lucide-react'
import { getArchivedShootingDays } from '@/actions/shooting-days'
import ShootingDayCard from '@/components/shooting-days/ShootingDayCard'
import styles from './archive.module.css'

export default async function ArchivePage() {
  const result = await getArchivedShootingDays()

  if ('error' in result) {
    return <p className={styles.errorText}>{result.error}</p>
  }

  const days = result.data

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <Link href="/shooting-days" className={styles.backLink}>
          <ArrowRight size={16} />
          ימי צילום
        </Link>
      </div>

      <h1 className={styles.title}>ארכיון ימי צילום</h1>

      {days.length === 0 ? (
        <div className={styles.empty}>
          <Archive size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>אין ימי צילום בארכיון</p>
        </div>
      ) : (
        <div className={styles.list}>
          {days.map((day) => (
            <ShootingDayCard key={day.id} {...day} isArchived />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create archive.module.css**

```css
/* src/app/(dashboard)/shooting-days/archive/archive.module.css */
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.nav {
  margin-block-end: calc(-1 * var(--space-3));
}

.backLink {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 150ms ease;
}

.backLink:hover {
  color: var(--color-primary);
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-12) var(--space-4);
  text-align: center;
}

.emptyIcon {
  color: var(--color-text-muted);
}

.emptyText {
  font-size: 1rem;
  color: var(--color-text-muted);
  margin: 0;
}

.errorText {
  color: var(--color-danger);
  font-size: 0.875rem;
}
```

- [ ] **Step 3: Commit all pages**

```bash
git add src/app/(dashboard)/shooting-days/
git commit -m "feat: add shooting days pages (list, new, detail, archive)"
```

---

### Task 17: Final Build Verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: Exits 0, no TypeScript or lint errors.

- [ ] **Step 3: Dev server smoke test**

```bash
npm run dev
```

Manually verify in browser:
1. Navigate to `/shooting-days` — list page loads (empty state shown)
2. Click "יום צילום חדש" — navigates to `/shooting-days/new`
3. Fill in date + title → submit → redirects to detail page
4. On detail page: header shows date, "הוסף סצנה" button visible
5. Add a scene → modal opens → fill title + required count → save → scene appears
6. Add a second scene → drag the scene cards → reorder persists after page reload
7. Edit a scene → changes persist
8. Delete a scene → confirmation modal → scene disappears
9. Archive the shooting day → redirects to archive page → day appears there → detail page shows read-only state (no edit/add buttons, no drag handles)
10. Navigate to `/shooting-days` — list shows the day card with scene count and gap info (since assignedCount=0, gap = totalRequired)

- [ ] **Step 4: Update CLAUDE_CODE_PHASES.md — mark Phase 5 as done**

In `docs/CLAUDE_CODE_PHASES.md`, change the Phase 5 header from:
```
## Phase 5 — Shooting Days & Scenes
```
to:
```
## Phase 5 — Shooting Days & Scenes ✅ DONE
```

And mark all acceptance criteria checkboxes as `[x]`.

- [ ] **Step 5: Final commit**

```bash
git add docs/CLAUDE_CODE_PHASES.md
git commit -m "docs: mark Phase 5 as complete"
```

---

## Phase 5 Acceptance Criteria (from spec)

- [ ] Shooting days list shows cards sorted by date
- [ ] Creating a shooting day saves and appears in the list
- [ ] Editing a shooting day updates correctly
- [ ] Shooting day detail renders with scenes (empty state if none)
- [ ] Adding a scene saves and appears in the list
- [ ] Editing a scene updates correctly
- [ ] Deleting a scene shows confirmation, then removes it
- [ ] Drag-and-drop reordering persists new `sortOrder` values
- [ ] Archiving moves the day to the archive list and makes it read-only
- [ ] Gap chip shows correct count on the shooting days list card
