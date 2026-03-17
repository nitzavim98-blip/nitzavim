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
