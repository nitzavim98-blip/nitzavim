'use server'

import { headers } from 'next/headers'
import { db } from '@/db'
import { extras } from '@/db/schema/extras'
import { availability } from '@/db/schema/availability'
import { photos } from '@/db/schema/photos'
import { productions } from '@/db/schema/productions'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { publicRegistrationSchema } from '@/lib/validations/registration'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateToken } from './tokens'

async function getFirstProduction() {
  const result = await db.select().from(productions).limit(1)
  return result[0] ?? null
}

export async function submitRegistration(input: unknown) {
  // Rate limit by IP
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await checkRateLimit(ip)
  if (!success) return { error: 'rate_limited' }

  // Validate input
  const parsed = publicRegistrationSchema.safeParse(input)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'שגיאת אימות' }

  const { token, availability: availRecords, ...fields } = parsed.data

  // Validate token
  const tokenRecord = await validateToken(token)
  if (!tokenRecord) return { error: 'הקישור אינו תקף' }

  // Get the (single) production
  const production = await getFirstProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  // Create extra
  const [created] = await db
    .insert(extras)
    .values({ ...fields, productionId: production.id, source: 'public_form' })
    .returning()

  // Insert availability records
  if (availRecords.length > 0) {
    await db.insert(availability).values(
      availRecords.map((r) => ({
        extraId: created.id,
        date: r.date,
        isAvailable: r.isAvailable,
      }))
    )
  }

  revalidatePath('/extras')
  return { data: { extraId: created.id } }
}

export async function addPublicPhoto(
  extraId: number,
  r2Key: string,
  sortOrder: number,
  token: string
) {
  // Validate token
  const tokenRecord = await validateToken(token)
  if (!tokenRecord) return { error: 'הקישור אינו תקף' }

  // Enforce max 3 photos for public registration
  const existing = await db
    .select({ id: photos.id })
    .from(photos)
    .where(eq(photos.extraId, extraId))
  if (existing.length >= 3) return { error: 'מקסימום 3 תמונות מותר' }

  const [photo] = await db
    .insert(photos)
    .values({ extraId, r2Key, sortOrder })
    .returning()

  return { data: photo }
}
