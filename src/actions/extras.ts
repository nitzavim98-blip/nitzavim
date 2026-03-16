'use server'

import { db } from '@/db'
import { extras } from '@/db/schema/extras'
import { attributeOptions } from '@/db/schema/attribute-options'
import { extraAttributes } from '@/db/schema/extra-attributes'
import { availability } from '@/db/schema/availability'
import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentProduction, requireAuth } from './auth'
import { createExtraSchema, updateExtraSchema } from '@/lib/validations/extra'

export async function getExtras() {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const result = await db
    .select()
    .from(extras)
    .where(and(eq(extras.productionId, production.id), isNull(extras.deletedAt)))
    .orderBy(extras.createdAt)

  return { data: result }
}

export async function getExtra(id: number) {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const result = await db
    .select()
    .from(extras)
    .where(
      and(
        eq(extras.id, id),
        eq(extras.productionId, production.id),
        isNull(extras.deletedAt)
      )
    )
    .limit(1)

  if (!result[0]) return { error: 'ניצב לא נמצא' }
  return { data: result[0] }
}

export async function createExtra(input: unknown) {
  await requireAuth()
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const parsed = createExtraSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'שגיאת אימות' }

  const [created] = await db
    .insert(extras)
    .values({ ...parsed.data, productionId: production.id })
    .returning()

  revalidatePath('/extras')
  return { data: created }
}

export async function updateExtra(id: number, input: unknown) {
  await requireAuth()
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const parsed = updateExtraSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'שגיאת אימות' }

  const [updated] = await db
    .update(extras)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(extras.id, id), eq(extras.productionId, production.id)))
    .returning()

  if (!updated) return { error: 'ניצב לא נמצא' }
  revalidatePath('/extras')
  revalidatePath(`/extras/${id}`)
  return { data: updated }
}

export async function deleteExtra(id: number) {
  await requireAuth()
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  await db
    .update(extras)
    .set({ deletedAt: new Date() })
    .where(and(eq(extras.id, id), eq(extras.productionId, production.id)))

  revalidatePath('/extras')
  return { data: true }
}

export async function toggleFavorite(id: number, isFavorite: boolean) {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  await db
    .update(extras)
    .set({ isFavorite, updatedAt: new Date() })
    .where(and(eq(extras.id, id), eq(extras.productionId, production.id)))

  return { data: true }
}

export async function getExtraWithDetails(id: number) {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const [extraResult, attrs, avail] = await Promise.all([
    db
      .select()
      .from(extras)
      .where(
        and(
          eq(extras.id, id),
          eq(extras.productionId, production.id),
          isNull(extras.deletedAt)
        )
      )
      .limit(1),
    db
      .select({ id: attributeOptions.id, label: attributeOptions.label })
      .from(extraAttributes)
      .innerJoin(attributeOptions, eq(extraAttributes.attributeId, attributeOptions.id))
      .where(eq(extraAttributes.extraId, id)),
    db
      .select()
      .from(availability)
      .where(eq(availability.extraId, id))
      .orderBy(availability.date),
  ])

  if (!extraResult[0]) return { error: 'ניצב לא נמצא' }

  return {
    data: {
      extra: extraResult[0],
      attributes: attrs,
      availability: avail,
    },
  }
}
