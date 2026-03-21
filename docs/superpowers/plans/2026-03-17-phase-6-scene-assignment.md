# Phase 6: Scene Assignment & Status Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up scene assignment — directors can assign extras to scenes via quick-search, advance them through the status flow (proposed → contacted → confirmed → arrived), see assignments in the extra's row, export a WhatsApp summary, and duplicate scenes.

**Architecture:** New `src/actions/extra-scenes.ts` handles all assignment mutations. The shooting-day detail page fetches all scene assignments server-side in one query and passes them down to `SortableSceneList → SceneBlock`. After any mutation (assign, status change, remove), the client calls `router.refresh()` to re-fetch server data. `ScenesSection` in the extras list row fetches lazily on first expand via `useEffect`. `ShootingDayHeader`'s disabled WhatsApp button is wired to a `generateWhatsAppSummary` server action.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM + Neon, CSS Modules, `lucide-react`, `date-fns` Hebrew locale, `react-hot-toast`, existing `Button`/`Modal` UI components.

---

## File Map

| File | Type | Purpose |
|------|------|---------|
| `src/actions/extra-scenes.ts` | **New** | assignExtra, updateExtraStatus, removeExtraFromScene, getSceneAssignmentsForDay, getExtraScenesByExtraId |
| `src/actions/scenes.ts` | **Modify** | Add `duplicateScene` |
| `src/actions/shooting-days.ts` | **Modify** | Add `generateWhatsAppSummary`; fix `attachStats` gap to use real confirmed+arrived count |
| `src/components/ui/StatusBadge/index.tsx` | **New** | Clickable status pill with dropdown (proposed/contacted/confirmed/arrived) |
| `src/components/ui/StatusBadge/StatusBadge.module.css` | **New** | Status badge styles |
| `src/components/shooting-days/ExtraSlot/index.tsx` | **New** | Single assigned extra: photo, name link, status badge, remove button |
| `src/components/shooting-days/ExtraSlot/ExtraSlot.module.css` | **New** | ExtraSlot styles |
| `src/components/shooting-days/QuickAssign/index.tsx` | **New** | Inline name-search + assign input within SceneBlock |
| `src/components/shooting-days/QuickAssign/QuickAssign.module.css` | **New** | QuickAssign styles |
| `src/components/extras/sections/ScenesSection/index.tsx` | **Modify** | Replace placeholder with real scene assignment cards; lazy fetch on expand |
| `src/components/extras/sections/ScenesSection/ScenesSection.module.css` | **Modify** | Add card/list styles |
| `src/components/shooting-days/SceneBlock/index.tsx` | **Modify** | Replace extras placeholder with ExtraSlot grid; add QuickAssign, duplicate, "מצא ניצבים" |
| `src/components/shooting-days/SortableSceneList/index.tsx` | **Modify** | Accept + thread `assignmentsBySceneId` prop down to SceneBlock |
| `src/components/shooting-days/ShootingDayHeader/index.tsx` | **Modify** | Wire WhatsApp export button (was disabled placeholder) |
| `src/components/extras/ExtraRow/index.tsx` | **Modify** | Pass `extraId` to ScenesSection |
| `src/app/(dashboard)/shooting-days/[id]/page.tsx` | **Modify** | Fetch `getSceneAssignmentsForDay`; pass to `SortableSceneList` |

---

## Chunk 1: Server Actions

### Task 1: extra-scenes Server Actions (New File)

**Files:**
- Create: `src/actions/extra-scenes.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/actions/extra-scenes.ts
'use server'

import { db } from '@/db'
import { extraScenes } from '@/db/schema/extra-scenes'
import { scenes } from '@/db/schema/scenes'
import { shootingDays } from '@/db/schema/shooting-days'
import { extras } from '@/db/schema/extras'
import { photos } from '@/db/schema/photos'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentProduction, requireAuth } from './auth'
import { generatePresignedGetUrl } from '@/lib/r2'

export type ExtraSlotData = {
  assignment: typeof extraScenes.$inferSelect
  extra: {
    id: number
    fullName: string
    phone: string | null
  }
  thumbnailUrl?: string
}

export type SceneAssignmentData = {
  assignment: typeof extraScenes.$inferSelect
  scene: {
    id: number
    title: string
    sortOrder: number
  }
  shootingDay: {
    id: number
    date: string
    title: string | null
  }
}

// Helper: get shootingDayId for a scene (for revalidation)
async function getShootingDayIdForScene(sceneId: number): Promise<number | null> {
  const result = await db
    .select({ shootingDayId: scenes.shootingDayId })
    .from(scenes)
    .where(eq(scenes.id, sceneId))
    .limit(1)
  return result[0]?.shootingDayId ?? null
}

export async function assignExtra(extraId: number, sceneId: number) {
  await requireAuth()

  // Check for duplicate assignment
  const existing = await db
    .select({ id: extraScenes.id })
    .from(extraScenes)
    .where(and(eq(extraScenes.extraId, extraId), eq(extraScenes.sceneId, sceneId)))
    .limit(1)

  if (existing.length > 0) return { error: 'הניצב כבר משובץ לסצנה זו' }

  const [created] = await db
    .insert(extraScenes)
    .values({ extraId, sceneId, status: 'proposed' })
    .returning()

  const shootingDayId = await getShootingDayIdForScene(sceneId)
  if (shootingDayId) revalidatePath(`/shooting-days/${shootingDayId}`)

  return { data: created }
}

export async function updateExtraStatus(
  extraSceneId: number,
  status: 'proposed' | 'contacted' | 'confirmed' | 'arrived'
) {
  await requireAuth()

  const [updated] = await db
    .update(extraScenes)
    .set({ status })
    .where(eq(extraScenes.id, extraSceneId))
    .returning()

  if (!updated) return { error: 'שיבוץ לא נמצא' }

  const shootingDayId = await getShootingDayIdForScene(updated.sceneId)
  if (shootingDayId) revalidatePath(`/shooting-days/${shootingDayId}`)

  return { data: updated }
}

export async function removeExtraFromScene(extraSceneId: number) {
  await requireAuth()

  const assignment = await db
    .select()
    .from(extraScenes)
    .where(eq(extraScenes.id, extraSceneId))
    .limit(1)

  if (!assignment[0]) return { error: 'שיבוץ לא נמצא' }

  await db.delete(extraScenes).where(eq(extraScenes.id, extraSceneId))

  const shootingDayId = await getShootingDayIdForScene(assignment[0].sceneId)
  if (shootingDayId) revalidatePath(`/shooting-days/${shootingDayId}`)

  return { data: { success: true } }
}

// Get all assignments for all scenes in a shooting day, grouped by sceneId.
// Used by the detail page to pass pre-fetched data to SceneBlock components.
export async function getSceneAssignmentsForDay(
  shootingDayId: number
): Promise<{ data: Record<number, ExtraSlotData[]> } | { error: string }> {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const dayScenes = await db
    .select({ id: scenes.id })
    .from(scenes)
    .where(eq(scenes.shootingDayId, shootingDayId))

  if (dayScenes.length === 0) return { data: {} }

  const sceneIds = dayScenes.map((s) => s.id)

  const assignments = await db
    .select()
    .from(extraScenes)
    .where(inArray(extraScenes.sceneId, sceneIds))

  if (assignments.length === 0) return { data: {} }

  const extraIds = [...new Set(assignments.map((a) => a.extraId))]

  const extrasList = await db
    .select({ id: extras.id, fullName: extras.fullName, phone: extras.phone })
    .from(extras)
    .where(inArray(extras.id, extraIds))

  const extrasMap = Object.fromEntries(extrasList.map((e) => [e.id, e]))

  // Primary photos only (sortOrder = 0)
  const primaryPhotos = await db
    .select({ extraId: photos.extraId, r2Key: photos.r2Key })
    .from(photos)
    .where(and(inArray(photos.extraId, extraIds), eq(photos.sortOrder, 0)))

  const photoUrlMap: Record<number, string> = {}
  await Promise.all(
    primaryPhotos.map(async (p) => {
      photoUrlMap[p.extraId] = await generatePresignedGetUrl(p.r2Key)
    })
  )

  // Group by sceneId
  const result: Record<number, ExtraSlotData[]> = {}
  for (const assignment of assignments) {
    const extra = extrasMap[assignment.extraId]
    if (!extra) continue
    if (!result[assignment.sceneId]) result[assignment.sceneId] = []
    result[assignment.sceneId].push({
      assignment,
      extra,
      thumbnailUrl: photoUrlMap[assignment.extraId],
    })
  }

  return { data: result }
}

// Get all scene assignments for a specific extra.
// Used by ScenesSection in the extra row to show where the extra appears.
export async function getExtraScenesByExtraId(
  extraId: number
): Promise<{ data: SceneAssignmentData[] } | { error: string }> {
  const assignments = await db
    .select()
    .from(extraScenes)
    .where(eq(extraScenes.extraId, extraId))

  if (assignments.length === 0) return { data: [] }

  const sceneIds = assignments.map((a) => a.sceneId)

  const sceneList = await db
    .select({
      id: scenes.id,
      title: scenes.title,
      sortOrder: scenes.sortOrder,
      shootingDayId: scenes.shootingDayId,
    })
    .from(scenes)
    .where(inArray(scenes.id, sceneIds))

  const shootingDayIds = [...new Set(sceneList.map((s) => s.shootingDayId))]

  const dayList = await db
    .select({ id: shootingDays.id, date: shootingDays.date, title: shootingDays.title })
    .from(shootingDays)
    .where(inArray(shootingDays.id, shootingDayIds))

  const scenesMap = Object.fromEntries(sceneList.map((s) => [s.id, s]))
  const daysMap = Object.fromEntries(dayList.map((d) => [d.id, d]))

  const result: SceneAssignmentData[] = assignments.flatMap((assignment) => {
    const scene = scenesMap[assignment.sceneId]
    if (!scene) return []
    const day = daysMap[scene.shootingDayId]
    if (!day) return []
    return [
      {
        assignment,
        scene: { id: scene.id, title: scene.title, sortOrder: scene.sortOrder },
        shootingDay: { id: day.id, date: day.date, title: day.title },
      },
    ]
  })

  return { data: result }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/royporat/repos/my_repos/for_nitzavim/nitzavim && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/extra-scenes.ts
git commit -m "feat: add extra-scenes server actions (assign, status, remove, fetch)"
```

---

### Task 2: Extend scenes.ts with duplicateScene

**Files:**
- Modify: `src/actions/scenes.ts`

- [ ] **Step 1: Add `duplicateScene` at the end of the file**

```typescript
export async function duplicateScene(sceneId: number) {
  await requireAuth()
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const original = await db
    .select()
    .from(scenes)
    .where(eq(scenes.id, sceneId))
    .limit(1)

  if (!original[0]) return { error: 'הסצנה לא נמצאה' }

  // Verify ownership through shooting day
  const day = await db
    .select()
    .from(shootingDays)
    .where(
      and(
        eq(shootingDays.id, original[0].shootingDayId),
        eq(shootingDays.productionId, production.id)
      )
    )
    .limit(1)

  if (!day[0]) return { error: 'יום הצילום לא נמצא' }

  // Get next sortOrder
  const existing = await db
    .select({ sortOrder: scenes.sortOrder })
    .from(scenes)
    .where(eq(scenes.shootingDayId, original[0].shootingDayId))

  const nextOrder =
    existing.length > 0 ? Math.max(...existing.map((s) => s.sortOrder)) + 1 : 0

  const [created] = await db
    .insert(scenes)
    .values({
      shootingDayId: original[0].shootingDayId,
      title: original[0].title,
      description: original[0].description,
      requiredExtras: original[0].requiredExtras,
      sortOrder: nextOrder,
    })
    .returning()

  revalidatePath(`/shooting-days/${original[0].shootingDayId}`)
  return { data: created }
}
```

Note: `scenes.ts` already imports `shootingDays`, `getCurrentProduction`, `requireAuth`, `and`, `eq`, `asc` — verify those imports are present. Add any missing ones.

- [ ] **Step 2: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/actions/scenes.ts
git commit -m "feat: add duplicateScene server action"
```

---

### Task 3: Extend shooting-days.ts — WhatsApp export + fix gap calculation

**Files:**
- Modify: `src/actions/shooting-days.ts`

Two changes:

**A) Fix `attachStats` to use real confirmed+arrived counts:**

Find the `attachStats` function and replace it with this version:

```typescript
async function attachStats(days: (typeof shootingDays.$inferSelect)[]) {
  if (days.length === 0) return []

  const allScenes = await db
    .select()
    .from(scenes)
    .where(inArray(scenes.shootingDayId, days.map((d) => d.id)))

  // Get confirmed+arrived counts per scene from extra_scenes
  const confirmedArrivedByScene: Record<number, number> = {}
  if (allScenes.length > 0) {
    const sceneIds = allScenes.map((s) => s.id)
    const assignments = await db
      .select({ sceneId: extraScenes.sceneId })
      .from(extraScenes)
      .where(
        and(
          inArray(extraScenes.sceneId, sceneIds),
          inArray(extraScenes.status, ['confirmed', 'arrived'])
        )
      )
    for (const a of assignments) {
      confirmedArrivedByScene[a.sceneId] =
        (confirmedArrivedByScene[a.sceneId] ?? 0) + 1
    }
  }

  return days.map((day) => {
    const dayScenes = allScenes.filter((s) => s.shootingDayId === day.id)
    const totalRequired = dayScenes.reduce((sum, s) => sum + s.requiredExtras, 0)
    const totalAssigned = dayScenes.reduce(
      (sum, s) => sum + (confirmedArrivedByScene[s.id] ?? 0),
      0
    )
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
```

**B) Add `generateWhatsAppSummary` (add at the bottom of the file):**

```typescript
export async function generateWhatsAppSummary(shootingDayId: number) {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const dayResult = await getShootingDay(shootingDayId)
  if ('error' in dayResult) return dayResult
  const day = dayResult.data

  const sceneList = await db
    .select()
    .from(scenes)
    .where(eq(scenes.shootingDayId, shootingDayId))
    .orderBy(asc(scenes.sortOrder))

  const parsedDate = new Date(day.date + 'T00:00:00')
  const formattedDate = format(parsedDate, 'EEEE, d בMMMM yyyy', { locale: he })

  if (sceneList.length === 0) {
    return { data: `📅 יום צילום: ${formattedDate}\n\nאין סצנות ליום זה.` }
  }

  const sceneIds = sceneList.map((s) => s.id)

  // All assignments for this day
  const assignments = await db
    .select({ sceneId: extraScenes.sceneId, extraId: extraScenes.extraId })
    .from(extraScenes)
    .where(inArray(extraScenes.sceneId, sceneIds))

  // Fetch extra names
  const extraIds = [...new Set(assignments.map((a) => a.extraId))]
  const extraNames: Record<number, string> = {}
  if (extraIds.length > 0) {
    const extraList = await db
      .select({ id: extras.id, fullName: extras.fullName })
      .from(extras)
      .where(inArray(extras.id, extraIds))
    extraList.forEach((e) => {
      extraNames[e.id] = e.fullName
    })
  }

  const extrasByScene: Record<number, string[]> = {}
  for (const a of assignments) {
    if (!extrasByScene[a.sceneId]) extrasByScene[a.sceneId] = []
    const name = extraNames[a.extraId]
    if (name) extrasByScene[a.sceneId].push(name)
  }

  let text = `📅 יום צילום: ${formattedDate}`
  sceneList.forEach((scene, index) => {
    const assigned = extrasByScene[scene.id] ?? []
    const gap = Math.max(0, scene.requiredExtras - assigned.length)
    text += `\n\n🎬 סצנה ${index + 1}: ${scene.title}`
    if (assigned.length > 0) {
      text += `\n   ניצבים: ${assigned.join(', ')}`
    }
    if (gap > 0) {
      text += `\n   ⚠️ חסרים: ${gap} ניצבים`
    }
  })

  return { data: text }
}
```

**Required imports to add** at the top of `shooting-days.ts`:
- `extraScenes` from `@/db/schema/extra-scenes`
- `extras` from `@/db/schema/extras`
- `format` from `date-fns`
- `he` from `date-fns/locale`
- Make sure `inArray` and `and` are already imported (they are from Phase 5)

- [ ] **Step 1: Update `attachStats` function**

Find the existing `attachStats` function and replace it with the version above.

- [ ] **Step 2: Add required imports** (`extraScenes`, `extras`, `format`, `he`)

- [ ] **Step 3: Add `generateWhatsAppSummary` function at the end of the file**

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/actions/shooting-days.ts
git commit -m "feat: add WhatsApp export + fix gap calculation with real assignment counts"
```

---

## Chunk 2: New UI Components

### Task 4: StatusBadge Component

**Files:**
- Create: `src/components/ui/StatusBadge/index.tsx`
- Create: `src/components/ui/StatusBadge/StatusBadge.module.css`

- [ ] **Step 1: Create index.tsx**

```typescript
// src/components/ui/StatusBadge/index.tsx
'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './StatusBadge.module.css'

export type StatusValue = 'proposed' | 'contacted' | 'confirmed' | 'arrived'

export const STATUS_LABELS: Record<StatusValue, string> = {
  proposed: 'הוצע',
  contacted: 'נשלחה הודעה',
  confirmed: 'אישר',
  arrived: 'הגיע',
}

const ALL_STATUSES: StatusValue[] = ['proposed', 'contacted', 'confirmed', 'arrived']

type Props = {
  status: StatusValue
  onStatusChange: (status: StatusValue) => Promise<void>
  disabled?: boolean
}

export default function StatusBadge({ status, onStatusChange, disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleSelect(newStatus: StatusValue) {
    if (newStatus === status) {
      setIsOpen(false)
      return
    }
    setIsUpdating(true)
    setIsOpen(false)
    await onStatusChange(newStatus)
    setIsUpdating(false)
  }

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.badge} ${styles[status]}`}
        onClick={() => !disabled && !isUpdating && setIsOpen((v) => !v)}
        disabled={disabled || isUpdating}
        aria-expanded={isOpen}
        aria-label={`סטטוס: ${STATUS_LABELS[status]}`}
      >
        {STATUS_LABELS[status]}
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.option} ${s === status ? styles.optionActive : ''}`}
              onClick={() => handleSelect(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create StatusBadge.module.css**

```css
/* src/components/ui/StatusBadge/StatusBadge.module.css */
.wrapper {
  position: relative;
  display: inline-block;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: opacity 150ms ease;
}

.badge:disabled {
  cursor: default;
  opacity: 0.7;
}

.proposed {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.contacted {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.confirmed {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.arrived {
  background: var(--color-text);
  color: white;
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  inset-inline-end: 0;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(30, 37, 64, 0.12);
  min-width: 140px;
  z-index: 20;
  overflow: hidden;
}

.option {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: right;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--color-text);
  background: none;
  border: none;
  cursor: pointer;
  transition: background 150ms ease;
}

.option:hover {
  background: var(--color-bg);
}

.optionActive {
  color: var(--color-primary);
  font-weight: 500;
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/components/ui/StatusBadge/
git commit -m "feat: add StatusBadge component with status dropdown"
```

---

### Task 5: ExtraSlot Component

**Files:**
- Create: `src/components/shooting-days/ExtraSlot/index.tsx`
- Create: `src/components/shooting-days/ExtraSlot/ExtraSlot.module.css`

- [ ] **Step 1: Create index.tsx**

```typescript
// src/components/shooting-days/ExtraSlot/index.tsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, UserCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateExtraStatus, removeExtraFromScene } from '@/actions/extra-scenes'
import type { ExtraSlotData } from '@/actions/extra-scenes'
import StatusBadge from '@/components/ui/StatusBadge'
import type { StatusValue } from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import styles from './ExtraSlot.module.css'

type Props = ExtraSlotData

export default function ExtraSlot({ assignment, extra, thumbnailUrl }: Props) {
  const router = useRouter()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [isRemoving, startRemoveTransition] = useTransition()

  async function handleStatusChange(status: StatusValue) {
    const result = await updateExtraStatus(assignment.id, status)
    if ('error' in result) {
      toast.error(result.error ?? 'אירעה שגיאה')
    } else {
      router.refresh()
    }
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const result = await removeExtraFromScene(assignment.id)
      if ('error' in result) {
        toast.error(result.error ?? 'אירעה שגיאה')
        return
      }
      toast.success('הניצב הוסר מהסצנה')
      setConfirmRemove(false)
      router.refresh()
    })
  }

  return (
    <>
      <div className={styles.slot}>
        <div className={styles.photo}>
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" className={styles.photoImg} />
          ) : (
            <UserCircle2 size={24} color="var(--color-text-muted)" />
          )}
        </div>

        <div className={styles.info}>
          <Link href={`/extras/${extra.id}`} className={styles.name}>
            {extra.fullName}
          </Link>
          <StatusBadge
            status={assignment.status as StatusValue}
            onStatusChange={handleStatusChange}
          />
        </div>

        <button
          className={styles.removeButton}
          onClick={() => setConfirmRemove(true)}
          aria-label="הסר מהסצנה"
        >
          <X size={14} />
        </button>
      </div>

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="הסר ניצב מהסצנה"
      >
        <p className={styles.confirmText}>
          להסיר את <strong>{extra.fullName}</strong> מהסצנה?
        </p>
        <div className={styles.confirmActions}>
          <Button
            variant="secondary"
            onClick={() => setConfirmRemove(false)}
            disabled={isRemoving}
          >
            ביטול
          </Button>
          <Button variant="danger" onClick={handleRemove} loading={isRemoving}>
            הסר
          </Button>
        </div>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Create ExtraSlot.module.css**

```css
/* src/components/shooting-days/ExtraSlot/ExtraSlot.module.css */
.slot {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  min-width: 0;
}

.photo {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
}

.photoImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 150ms ease;
}

.name:hover {
  color: var(--color-primary);
}

.removeButton {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-muted);
  border-radius: 4px;
  flex-shrink: 0;
  transition: color 150ms ease, background 150ms ease;
}

.removeButton:hover {
  color: var(--color-danger);
  background: var(--color-danger-subtle);
}

.confirmText {
  font-size: 0.9375rem;
  color: var(--color-text);
  margin: 0 0 var(--space-6) 0;
}

.confirmActions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/components/shooting-days/ExtraSlot/
git commit -m "feat: add ExtraSlot component (assigned extra with status badge + remove)"
```

---

### Task 6: QuickAssign Component

**Files:**
- Create: `src/components/shooting-days/QuickAssign/index.tsx`
- Create: `src/components/shooting-days/QuickAssign/QuickAssign.module.css`

- [ ] **Step 1: Create index.tsx**

```typescript
// src/components/shooting-days/QuickAssign/index.tsx
'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getExtras } from '@/actions/extras'
import { assignExtra } from '@/actions/extra-scenes'
import type { Extra } from '@/db/schema/extras'
import styles from './QuickAssign.module.css'

type Props = {
  sceneId: number
  onAssigned: () => void
  onClose: () => void
}

export default function QuickAssign({ sceneId, onAssigned, onClose }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [allExtras, setAllExtras] = useState<Extra[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAssigning, startAssignTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    setIsLoading(true)
    getExtras().then((result) => {
      setIsLoading(false)
      if ('data' in result) setAllExtras(result.data)
    })
  }, [])

  const filtered =
    query.trim().length >= 1
      ? allExtras.filter((e) =>
          e.fullName.toLowerCase().includes(query.toLowerCase())
        )
      : []

  function handleAssign(extra: Extra) {
    startAssignTransition(async () => {
      const result = await assignExtra(extra.id, sceneId)
      if ('error' in result) {
        toast.error(result.error ?? 'אירעה שגיאה')
        return
      }
      toast.success(`${extra.fullName} שובץ לסצנה`)
      router.refresh()
      onAssigned()
    })
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <Search size={16} className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש ניצב לפי שם..."
          className={styles.input}
          disabled={isAssigning}
        />
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="סגור חיפוש"
        >
          <X size={16} />
        </button>
      </div>

      {isLoading && <p className={styles.hint}>טוען...</p>}
      {!isLoading && query.trim() && filtered.length === 0 && (
        <p className={styles.hint}>לא נמצאו ניצבים</p>
      )}
      {filtered.length > 0 && (
        <div className={styles.results}>
          {filtered.slice(0, 6).map((extra) => (
            <button
              key={extra.id}
              className={styles.result}
              onClick={() => handleAssign(extra)}
              disabled={isAssigning}
            >
              <span className={styles.resultName}>{extra.fullName}</span>
              {extra.age != null && (
                <span className={styles.resultAge}>גיל {extra.age}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create QuickAssign.module.css**

```css
/* src/components/shooting-days/QuickAssign/QuickAssign.module.css */
.wrapper {
  border-block-start: 1px solid var(--color-border);
  padding: var(--space-3);
  background: var(--color-bg);
}

.inputRow {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-card);
  border: 1px solid var(--color-border-input);
  border-radius: 8px;
  padding: 6px var(--space-3);
}

.searchIcon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.input {
  flex: 1;
  border: none;
  background: none;
  font-size: 0.875rem;
  color: var(--color-text);
  font-family: inherit;
  outline: none;
}

.input::placeholder {
  color: var(--color-text-muted);
}

.closeButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-muted);
  border-radius: 4px;
  flex-shrink: 0;
  transition: color 150ms ease;
}

.closeButton:hover {
  color: var(--color-text);
}

.hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: var(--space-2) 0 0 0;
  padding: 0 var(--space-1);
}

.results {
  margin-block-start: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 8px var(--space-3);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  text-align: right;
  width: 100%;
  font-family: inherit;
  transition: background 150ms ease, border-color 150ms ease;
}

.result:hover:not(:disabled) {
  background: var(--color-card-hover);
  border-color: var(--color-primary-light);
}

.result:disabled {
  opacity: 0.6;
  cursor: default;
}

.resultName {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  flex: 1;
}

.resultAge {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/components/shooting-days/QuickAssign/
git commit -m "feat: add QuickAssign inline search component"
```

---

## Chunk 3: Update Existing Components

### Task 7: Update ScenesSection — real data

**Files:**
- Modify: `src/components/extras/sections/ScenesSection/index.tsx`
- Modify: `src/components/extras/sections/ScenesSection/ScenesSection.module.css`

- [ ] **Step 1: Replace index.tsx**

Replace the entire file with:

```typescript
// src/components/extras/sections/ScenesSection/index.tsx
'use client'

import { useState, useEffect } from 'react'
import { Film } from 'lucide-react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { getExtraScenesByExtraId } from '@/actions/extra-scenes'
import type { SceneAssignmentData } from '@/actions/extra-scenes'
import { STATUS_LABELS } from '@/components/ui/StatusBadge'
import styles from './ScenesSection.module.css'

type Props = {
  extraId: number
  isExpanded: boolean
}

export default function ScenesSection({ extraId, isExpanded }: Props) {
  const [assignments, setAssignments] = useState<SceneAssignmentData[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only fetch on first expand; cache afterwards
    if (!isExpanded || assignments !== null) return
    setLoading(true)
    getExtraScenesByExtraId(extraId).then((result) => {
      setLoading(false)
      if ('data' in result) setAssignments(result.data)
    })
  }, [isExpanded, extraId, assignments])

  if (loading) {
    return <p className={styles.loading}>טוען...</p>
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className={styles.empty}>
        <Film size={32} color="var(--color-text-muted)" />
        <p className={styles.emptyText}>לא הופיע בסצנות עדיין</p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {assignments.map(({ assignment, scene, shootingDay }) => {
        const parsedDate = new Date(shootingDay.date + 'T00:00:00')
        const formattedDate = format(parsedDate, 'd בMMMM yyyy', { locale: he })

        return (
          <div key={assignment.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.sceneBadge}>סצנה {scene.sortOrder + 1}</span>
              <span className={styles.sceneTitle}>{scene.title}</span>
              <span className={styles.statusChip}>
                {STATUS_LABELS[assignment.status as keyof typeof STATUS_LABELS] ?? assignment.status}
              </span>
            </div>
            <p className={styles.date}>
              {formattedDate}
              {shootingDay.title ? ` — ${shootingDay.title}` : ''}
            </p>
            {(assignment.situation || assignment.look) && (
              <div className={styles.details}>
                {assignment.situation && (
                  <span className={styles.detail}>תפקיד: {assignment.situation}</span>
                )}
                {assignment.look && (
                  <span className={styles.lookPill}>{assignment.look}</span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Update ScenesSection.module.css** — replace with full styles:

```css
/* src/components/extras/sections/ScenesSection/ScenesSection.module.css */
.loading {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
  padding: var(--space-2);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-4);
}

.emptyText {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.cardHeader {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.sceneBadge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-primary-subtle);
  color: var(--color-primary-text);
  border-radius: 100px;
  font-size: 0.6875rem;
  font-weight: 700;
}

.sceneTitle {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  flex: 1;
}

.statusChip {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border-radius: 100px;
  padding: 2px 8px;
  border: 1px solid var(--color-border);
}

.date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.details {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-block-start: 2px;
}

.detail {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.lookPill {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 100px;
  font-size: 0.75rem;
  color: var(--color-text);
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/components/extras/sections/ScenesSection/
git commit -m "feat: wire up ScenesSection with real scene assignment data"
```

---

### Task 8: Update ExtraRow — pass extraId to ScenesSection

**Files:**
- Modify: `src/components/extras/ExtraRow/index.tsx`

- [ ] **Step 1: Update the ScenesSection render call**

Find this line in ExtraRow (in the expandable sections area):
```tsx
<ScenesSection />
```

Replace with:
```tsx
<ScenesSection extraId={extra.id} isExpanded={activeSection === 'scenes'} />
```

Also update the `scenes` expand button to remove the muted hardcode. Find:
```tsx
{expandBtn('scenes', <Clapperboard size={20} />, 'סצנות', true)}
```

Change to:
```tsx
{expandBtn('scenes', <Clapperboard size={20} />, 'סצנות')}
```
(Remove the `true` argument — the button is now always active since we have real data.)

- [ ] **Step 2: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/components/extras/ExtraRow/index.tsx
git commit -m "feat: wire ExtraRow ScenesSection with extraId prop"
```

---

### Task 9: Update SceneBlock — extras grid, quick assign, duplicate, find

**Files:**
- Modify: `src/components/shooting-days/SceneBlock/index.tsx`
- Modify: `src/components/shooting-days/SceneBlock/SceneBlock.module.css`

This is the most significant component change. Replace the full file:

- [ ] **Step 1: Replace index.tsx**

```typescript
// src/components/shooting-days/SceneBlock/index.tsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Pencil,
  Trash2,
  Copy,
  Search,
  UserPlus,
  Users,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { deleteScene, duplicateScene } from '@/actions/scenes'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import SceneForm from '@/components/shooting-days/SceneForm'
import ExtraSlot from '@/components/shooting-days/ExtraSlot'
import QuickAssign from '@/components/shooting-days/QuickAssign'
import type { Scene } from '@/db/schema/scenes'
import type { ExtraSlotData } from '@/actions/extra-scenes'
import styles from './SceneBlock.module.css'

type Props = {
  scene: Scene
  sceneNumber: number
  assignments?: ExtraSlotData[]
  isReadOnly?: boolean
}

export default function SceneBlock({
  scene,
  sceneNumber,
  assignments = [],
  isReadOnly,
}: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showQuickAssign, setShowQuickAssign] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isDuplicating, startDuplicateTransition] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id, disabled: isReadOnly })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Gap uses confirmed+arrived count per spec
  const assignedCount = assignments.filter((a) =>
    ['confirmed', 'arrived'].includes(a.assignment.status)
  ).length
  const gap = Math.max(0, scene.requiredExtras - assignedCount)
  const isFull = scene.requiredExtras > 0 && gap === 0

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteScene(scene.id)
      if ('error' in result) {
        toast.error(result.error ?? 'אירעה שגיאה')
        return
      }
      toast.success('הסצנה נמחקה')
      setConfirmDelete(false)
    })
  }

  function handleDuplicate() {
    startDuplicateTransition(async () => {
      const result = await duplicateScene(scene.id)
      if ('error' in result) {
        toast.error(result.error ?? 'אירעה שגיאה')
        return
      }
      toast.success('הסצנה שוכפלה')
      router.refresh()
    })
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`${styles.block} ${isDragging ? styles.dragging : ''}`}
      >
        {/* Header row */}
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
                  onClick={handleDuplicate}
                  disabled={isDuplicating}
                  aria-label="שכפל סצנה"
                  title="שכפל סצנה"
                >
                  <Copy size={16} />
                </button>
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

        {/* Assigned extras grid */}
        <div className={styles.extrasArea}>
          {assignments.length > 0 ? (
            <div className={styles.extrasGrid}>
              {assignments.map((slot) => (
                <ExtraSlot key={slot.assignment.id} {...slot} />
              ))}
            </div>
          ) : (
            <div className={styles.extrasEmpty}>
              <Users size={14} className={styles.extrasEmptyIcon} />
              <span>אין ניצבים משובצים לסצנה</span>
            </div>
          )}

          {/* Action buttons area */}
          {!isReadOnly && (
            <div className={styles.assignActions}>
              <Link
                href={`/search?sceneId=${scene.id}`}
                className={styles.findButton}
              >
                <Search size={14} />
                מצא ניצבים
              </Link>
              <button
                className={styles.quickAssignButton}
                onClick={() => setShowQuickAssign((v) => !v)}
                aria-label="שיבוץ מהיר"
              >
                <UserPlus size={14} />
                שיבוץ מהיר
              </button>
            </div>
          )}
        </div>

        {/* QuickAssign inline panel */}
        {showQuickAssign && !isReadOnly && (
          <QuickAssign
            sceneId={scene.id}
            onAssigned={() => setShowQuickAssign(false)}
            onClose={() => setShowQuickAssign(false)}
          />
        )}
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

- [ ] **Step 2: Update SceneBlock.module.css** — add new styles (keep existing, add below):

Keep all existing CSS and ADD these new rules:

```css
/* Extra area — replace old .extrasPlaceholder */
.extrasArea {
  background: var(--color-bg);
  border-block-start: 1px solid var(--color-border);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.extrasGrid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.extrasEmpty {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.extrasEmptyIcon {
  flex-shrink: 0;
}

.assignActions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.findButton,
.quickAssignButton {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;
  text-decoration: none;
}

.findButton {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.findButton:hover {
  border-color: var(--color-primary-light);
  color: var(--color-primary);
}

.quickAssignButton {
  background: var(--color-primary-subtle);
  border: 1px solid transparent;
  color: var(--color-primary);
}

.quickAssignButton:hover {
  background: var(--color-primary-light);
  color: white;
}
```

Also, **remove** the old `.extrasPlaceholder` and `.placeholderIcon` rules from the CSS file (they are replaced by `.extrasArea` / `.extrasEmpty`).

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/components/shooting-days/SceneBlock/
git commit -m "feat: update SceneBlock with extras grid, quick assign, duplicate, find"
```

---

### Task 10: Update SortableSceneList — pass assignments

**Files:**
- Modify: `src/components/shooting-days/SortableSceneList/index.tsx`

- [ ] **Step 1: Update the component**

Replace the full file:

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
import type { ExtraSlotData } from '@/actions/extra-scenes'
import styles from './SortableSceneList.module.css'

type Props = {
  scenes: Scene[]
  shootingDayId: number
  assignmentsBySceneId?: Record<number, ExtraSlotData[]>
  isReadOnly?: boolean
}

export default function SortableSceneList({
  scenes: initialScenes,
  shootingDayId,
  assignmentsBySceneId = {},
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
            assignments={assignmentsBySceneId[scene.id] ?? []}
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
              assignments={assignmentsBySceneId[scene.id] ?? []}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

- [ ] **Step 2: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/components/shooting-days/SortableSceneList/index.tsx
git commit -m "feat: update SortableSceneList to thread assignment data to SceneBlock"
```

---

### Task 11: Update ShootingDayHeader — wire WhatsApp export

**Files:**
- Modify: `src/components/shooting-days/ShootingDayHeader/index.tsx`

The WhatsApp export button is currently disabled. Wire it up:

- [ ] **Step 1: Update the component**

Add `useTransition` for the export, import `generateWhatsAppSummary`, and wire the button:

Find the existing `'use client'` file and make these changes:

1. Add import:
```typescript
import { archiveShootingDay, generateWhatsAppSummary } from '@/actions/shooting-days'
```
(replace the existing `archiveShootingDay` import line)

2. Add state/transition at the top of the component function:
```typescript
const [isExporting, startExportTransition] = useTransition()
```

3. Add handler function:
```typescript
function handleWhatsAppExport() {
  startExportTransition(async () => {
    const result = await generateWhatsAppSummary(day.id)
    if ('error' in result) {
      toast.error(result.error ?? 'אירעה שגיאה')
      return
    }
    try {
      await navigator.clipboard.writeText(result.data)
      toast.success('הועתק ללוח!')
    } catch {
      toast.error('שגיאה בהעתקה ללוח')
    }
  })
}
```

4. Replace the disabled WhatsApp button:
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={handleWhatsAppExport}
  disabled={isExporting}
  aria-label="ייצוא לווצאפ"
>
  <MessageSquare size={16} />
  ייצוא לווצאפ
</Button>
```

- [ ] **Step 2: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/components/shooting-days/ShootingDayHeader/index.tsx
git commit -m "feat: wire WhatsApp export button in ShootingDayHeader"
```

---

## Chunk 4: Page Integration + Final Verification

### Task 12: Update Shooting Day Detail Page — fetch assignments

**Files:**
- Modify: `src/app/(dashboard)/shooting-days/[id]/page.tsx`

- [ ] **Step 1: Update the page**

Replace the full file:

```typescript
// src/app/(dashboard)/shooting-days/[id]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getShootingDay } from '@/actions/shooting-days'
import { getScenes } from '@/actions/scenes'
import { getSceneAssignmentsForDay } from '@/actions/extra-scenes'
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

  const [dayResult, scenesResult, assignmentsResult] = await Promise.all([
    getShootingDay(id),
    getScenes(id),
    getSceneAssignmentsForDay(id),
  ])

  if ('error' in dayResult) notFound()
  if ('error' in scenesResult) notFound()

  const day = dayResult.data
  const sceneList = scenesResult.data
  const assignmentsBySceneId =
    'data' in assignmentsResult ? assignmentsResult.data : {}

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
          assignmentsBySceneId={assignmentsBySceneId}
          isReadOnly={day.isArchived}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/app/(dashboard)/shooting-days/[id]/page.tsx
git commit -m "feat: fetch and thread scene assignments through shooting day detail page"
```

---

### Task 13: Final Build Verification + Mark Phase 6 Done

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

Start `npm run dev` and manually verify:

1. `/shooting-days/[id]` — scene has empty extras area with "אין ניצבים משובצים" + "שיבוץ מהיר" + "מצא ניצבים" buttons
2. Click "שיבוץ מהיר" → inline search appears → type name → select extra → extra appears as ExtraSlot
3. ExtraSlot shows status badge → click → dropdown shows 4 options → change status → badge updates
4. Assigning same extra twice → error toast "הניצב כבר משובץ לסצנה זו"
5. Remove extra (×) → confirmation modal → extra disappears
6. Gap indicator updates: confirmed+arrived count toward required
7. "ייצוא לווצאפ" button → copies text to clipboard → success toast
8. Copy (⧉) button on scene → toast "הסצנה שוכפלה" → duplicate appears
9. `/extras` → expand a row's "סצנות" section → shows assigned scenes (or empty state)
10. Shooting days list page → gap chip reflects real confirmed+arrived counts

- [ ] **Step 4: Update CLAUDE_CODE_PHASES.md — mark Phase 6 as done**

In `docs/CLAUDE_CODE_PHASES.md`:
- Change `## Phase 6 — Scene Assignment & Status Flow` to `## Phase 6 — Scene Assignment & Status Flow ✅ DONE`
- Change all `- [ ]` to `- [x]` within Phase 6's acceptance criteria (section 6.8)

- [ ] **Step 5: Final commit**

```bash
git add docs/CLAUDE_CODE_PHASES.md
git commit -m "docs: mark Phase 6 as complete"
```

---

## Phase 6 Acceptance Criteria (from spec)

- [ ] Extras can be assigned to scenes from the shooting day detail
- [ ] Assigning a duplicate shows an error toast
- [ ] Status badge renders correct color per status
- [ ] Clicking status badge shows dropdown; selecting a new status updates DB and UI
- [ ] `confirmed + arrived` count updates the gap indicator
- [ ] Removing an extra from a scene requires confirmation
- [ ] "Scenes" section in extra row shows all scene assignments with look/situation
- [ ] Empty state for scenes section renders correctly with muted button
- [ ] WhatsApp export copies correct formatted text to clipboard
- [ ] Duplicate scene creates a copy without assignments
