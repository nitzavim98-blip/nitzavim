'use server'

import { randomBytes } from 'crypto'
import { db } from '@/db'
import { registrationTokens } from '@/db/schema/registration-tokens'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/actions/auth'
import { z } from 'zod'

const deactivateTokenSchema = z.object({
  id: z.number().int().positive(),
})

export async function getTokens() {
  await requireAuth()

  const tokens = await db
    .select()
    .from(registrationTokens)
    .orderBy(registrationTokens.createdAt)

  return { data: tokens }
}

export async function createToken() {
  const user = await requireAuth()
  if (user.role === 'guest') return { error: 'אין הרשאה ליצור לינקי הרשמה' }

  const token = randomBytes(32).toString('hex')

  const [created] = await db
    .insert(registrationTokens)
    .values({ token, isActive: true })
    .returning()

  if (!created) {
    return { error: 'שגיאה ביצירת הלינק' }
  }

  return { data: created }
}

export async function deactivateToken(id: number) {
  const user = await requireAuth()
  if (user.role === 'guest') return { error: 'אין הרשאה להשהות לינקי הרשמה' }

  const parsed = deactivateTokenSchema.safeParse({ id })
  if (!parsed.success) {
    return { error: 'מזהה לינק לא תקין' }
  }

  const [updated] = await db
    .update(registrationTokens)
    .set({ isActive: false })
    .where(eq(registrationTokens.id, parsed.data.id))
    .returning()

  if (!updated) {
    return { error: 'הלינק לא נמצא' }
  }

  return { data: updated }
}
