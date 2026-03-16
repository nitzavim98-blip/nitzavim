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
