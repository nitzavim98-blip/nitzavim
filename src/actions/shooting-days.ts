// src/actions/shooting-days.ts
'use server'

import { db } from '@/db'
import { shootingDays } from '@/db/schema/shooting-days'
import { scenes } from '@/db/schema/scenes'
import { extraScenes } from '@/db/schema/extra-scenes'
import { extras } from '@/db/schema/extras'
import { and, eq, asc, desc, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentProduction, requireAuth } from './auth'
import {
  createShootingDaySchema,
  updateShootingDaySchema,
} from '@/lib/validations/shooting-day'
import { format, addDays } from 'date-fns'
import { he } from 'date-fns/locale'

// Helper: given a list of shooting days, fetch their scene stats.
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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'שגיאת אימות' }

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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'שגיאת אימות' }

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

export type SceneWithExtras = {
  id: number
  shootingDayId: number
  title: string
  description: string | null
  sortOrder: number
  requiredExtras: number
  createdAt: Date
  extras: Array<{ extraId: number; name: string; status: string }>
}

export type DayWithScenes = typeof shootingDays.$inferSelect & {
  scenes: SceneWithExtras[]
}

export async function getShootingDayForDate(
  date: string
): Promise<{ data: DayWithScenes | null } | { error: string }> {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const dayResult = await db
    .select()
    .from(shootingDays)
    .where(
      and(
        eq(shootingDays.productionId, production.id),
        eq(shootingDays.date, date),
        eq(shootingDays.isArchived, false)
      )
    )
    .limit(1)

  if (!dayResult[0]) return { data: null }

  const day = dayResult[0]
  const sceneList = await db
    .select()
    .from(scenes)
    .where(eq(scenes.shootingDayId, day.id))
    .orderBy(asc(scenes.sortOrder))

  if (sceneList.length === 0) {
    return { data: { ...day, scenes: [] } }
  }

  const sceneIds = sceneList.map((s) => s.id)
  const assignments = await db
    .select({
      sceneId: extraScenes.sceneId,
      extraId: extraScenes.extraId,
      status: extraScenes.status,
      extraName: extras.fullName,
    })
    .from(extraScenes)
    .innerJoin(extras, eq(extraScenes.extraId, extras.id))
    .where(inArray(extraScenes.sceneId, sceneIds))

  const assignmentsByScene: Record<
    number,
    Array<{ extraId: number; name: string; status: string }>
  > = {}
  for (const a of assignments) {
    if (!assignmentsByScene[a.sceneId]) assignmentsByScene[a.sceneId] = []
    assignmentsByScene[a.sceneId].push({
      extraId: a.extraId,
      name: a.extraName,
      status: a.status,
    })
  }

  const scenesWithExtras: SceneWithExtras[] = sceneList.map((scene) => ({
    ...scene,
    extras: assignmentsByScene[scene.id] ?? [],
  }))

  return { data: { ...day, scenes: scenesWithExtras } }
}

export async function getTodayAndTomorrowDays() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const [todayResult, tomorrowResult] = await Promise.all([
    getShootingDayForDate(today),
    getShootingDayForDate(tomorrow),
  ])
  return { todayResult, tomorrowResult }
}

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
