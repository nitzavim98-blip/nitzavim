'use server'

import { db } from '@/db'
import { attributeOptions, type AttributeOption } from '@/db/schema/attribute-options'
import { extraAttributes } from '@/db/schema/extra-attributes'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireAuth } from './auth'
import { createAttributeOptionSchema } from '@/lib/validations/attribute-option'

export async function getAttributeOptions(): Promise<
  { data: AttributeOption[] } | { error: string }
> {
  try {
    const result = await db
      .select()
      .from(attributeOptions)
      .orderBy(attributeOptions.id)
    return { data: result }
  } catch {
    return { error: 'שגיאה בטעינת המאפיינים' }
  }
}

export async function createAttributeOption(label: string) {
  await requireAuth()

  const parsed = createAttributeOptionSchema.safeParse({ label: label.trim() })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'שם המאפיין לא תקין' }
  }

  const trimmed = parsed.data.label

  const existing = await db
    .select()
    .from(attributeOptions)
    .where(eq(attributeOptions.label, trimmed))
    .limit(1)

  if (existing[0]) return { error: 'מאפיין זה כבר קיים' }

  const [created] = await db
    .insert(attributeOptions)
    .values({ label: trimmed })
    .returning()

  revalidatePath('/settings')
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

export async function deleteAttributeOption(id: number) {
  await requireAuth()

  try {
    await db.delete(attributeOptions).where(eq(attributeOptions.id, id))
    revalidatePath('/settings')
    return { data: true }
  } catch {
    return { error: 'שגיאה במחיקת המאפיין' }
  }
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
