'use server'

import { db } from '@/db'
import { availability } from '@/db/schema/availability'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireAuth } from './auth'

export async function getExtraAvailability(extraId: number) {
  const result = await db
    .select()
    .from(availability)
    .where(eq(availability.extraId, extraId))
    .orderBy(availability.date)
  return { data: result }
}

export async function syncAvailability(
  extraId: number,
  records: { date: string; isAvailable: boolean }[]
) {
  await requireAuth()

  await db.delete(availability).where(eq(availability.extraId, extraId))

  if (records.length > 0) {
    await db
      .insert(availability)
      .values(records.map((r) => ({ extraId, date: r.date, isAvailable: r.isAvailable })))
  }

  revalidatePath('/extras')
  return { data: true }
}

export async function upsertAvailability(
  extraId: number,
  date: string,
  isAvailable: boolean
) {
  await requireAuth()

  const existing = await db
    .select()
    .from(availability)
    .where(and(eq(availability.extraId, extraId), eq(availability.date, date)))
    .limit(1)

  if (existing[0]) {
    await db
      .update(availability)
      .set({ isAvailable })
      .where(eq(availability.id, existing[0].id))
  } else {
    await db.insert(availability).values({ extraId, date, isAvailable })
  }

  revalidatePath('/extras')
  return { data: true }
}

export async function deleteAvailability(extraId: number, date: string) {
  await requireAuth()

  await db
    .delete(availability)
    .where(and(eq(availability.extraId, extraId), eq(availability.date, date)))

  revalidatePath('/extras')
  return { data: true }
}
