// src/actions/scenes.ts
'use server'

import { db } from '@/db'
import { scenes } from '@/db/schema/scenes'
import { shootingDays } from '@/db/schema/shooting-days'
import { extraScenes } from '@/db/schema/extra-scenes'
import { and, eq, asc, inArray } from 'drizzle-orm'
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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'שגיאת אימות' }

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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'שגיאת אימות' }

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
