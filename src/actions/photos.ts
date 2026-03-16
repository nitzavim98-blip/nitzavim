'use server'

import { db } from '@/db'
import { photos } from '@/db/schema/photos'
import { eq, and, asc, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireAuth } from './auth'
import { generatePresignedGetUrl, deleteR2Object } from '@/lib/r2'

export async function createPhoto(input: {
  extraId: number
  r2Key: string
  sortOrder: number
}) {
  await requireAuth()

  const existing = await db
    .select({ id: photos.id })
    .from(photos)
    .where(eq(photos.extraId, input.extraId))

  if (existing.length >= 5) return { error: 'מקסימום 5 תמונות מותר' }

  const [created] = await db.insert(photos).values(input).returning()

  revalidatePath('/extras')
  revalidatePath(`/extras/${input.extraId}`)
  return { data: created }
}

export async function deletePhoto(photoId: number) {
  await requireAuth()

  const [photo] = await db
    .select()
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1)

  if (!photo) return { error: 'תמונה לא נמצאה' }

  await deleteR2Object(photo.r2Key)
  await db.delete(photos).where(eq(photos.id, photoId))

  revalidatePath('/extras')
  revalidatePath(`/extras/${photo.extraId}`)
  return { data: true }
}

export async function reorderPhotos(updates: Array<{ id: number; sortOrder: number }>) {
  await requireAuth()

  await Promise.all(
    updates.map(({ id, sortOrder }) =>
      db.update(photos).set({ sortOrder }).where(eq(photos.id, id))
    )
  )

  return { data: true }
}

export async function getPhotosByExtraId(extraId: number) {
  const result = await db
    .select()
    .from(photos)
    .where(eq(photos.extraId, extraId))
    .orderBy(asc(photos.sortOrder))

  return { data: result }
}

export async function getPhotoUrlsMap(r2Keys: string[]): Promise<Record<string, string>> {
  if (r2Keys.length === 0) return {}

  const entries = await Promise.all(
    r2Keys.map(async (key) => [key, await generatePresignedGetUrl(key)] as const)
  )
  return Object.fromEntries(entries)
}

// Returns a map of extraId → presigned URL for the primary (sortOrder=0) photo
export async function getPrimaryPhotoUrlsByExtraIds(
  extraIds: number[]
): Promise<Record<number, string>> {
  if (extraIds.length === 0) return {}

  const primaryPhotos = await db
    .select({ extraId: photos.extraId, r2Key: photos.r2Key })
    .from(photos)
    .where(and(inArray(photos.extraId, extraIds), eq(photos.sortOrder, 0)))

  const urlMap: Record<number, string> = {}
  await Promise.all(
    primaryPhotos.map(async (p) => {
      urlMap[p.extraId] = await generatePresignedGetUrl(p.r2Key)
    })
  )

  return urlMap
}
