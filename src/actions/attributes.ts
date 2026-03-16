'use server'

import { db } from '@/db'
import { attributeOptions } from '@/db/schema/attribute-options'
import { extraAttributes } from '@/db/schema/extra-attributes'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireAuth } from './auth'

export async function getAttributeOptions() {
  const result = await db
    .select()
    .from(attributeOptions)
    .orderBy(attributeOptions.id)
  return { data: result }
}

export async function createAttributeOption(label: string) {
  await requireAuth()
  const trimmed = label.trim()
  if (!trimmed) return { error: 'שם המאפיין לא יכול להיות ריק' }

  const existing = await db
    .select()
    .from(attributeOptions)
    .where(eq(attributeOptions.label, trimmed))
    .limit(1)

  if (existing[0]) return { data: existing[0] }

  const [created] = await db
    .insert(attributeOptions)
    .values({ label: trimmed })
    .returning()

  return { data: created }
}

export async function getExtraAttributes(extraId: number) {
  const result = await db
    .select({ id: attributeOptions.id, label: attributeOptions.label })
    .from(extraAttributes)
    .innerJoin(attributeOptions, eq(extraAttributes.attributeId, attributeOptions.id))
    .where(eq(extraAttributes.extraId, extraId))
  return { data: result }
}

export async function syncExtraAttributes(extraId: number, attributeIds: number[]) {
  await requireAuth()

  await db.delete(extraAttributes).where(eq(extraAttributes.extraId, extraId))

  if (attributeIds.length > 0) {
    await db
      .insert(extraAttributes)
      .values(attributeIds.map((id) => ({ extraId, attributeId: id })))
  }

  revalidatePath('/extras')
  return { data: true }
}
