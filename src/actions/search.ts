'use server'

import { db } from '@/db'
import { extras } from '@/db/schema/extras'
import { extraAttributes } from '@/db/schema/extra-attributes'
import { attributeOptions } from '@/db/schema/attribute-options'
import { availability } from '@/db/schema/availability'
import { photos } from '@/db/schema/photos'
import { and, eq, isNull, inArray, or, ilike, gte, lte, sql } from 'drizzle-orm'
import { getCurrentProduction } from './auth'
import { searchFiltersSchema } from '@/lib/validations/search'
import { generatePresignedGetUrl } from '@/lib/r2'

export type SearchResult = {
  id: number
  fullName: string
  age: number | null
  gender: number
  hasCar: boolean
  isFavorite: boolean
  phone: string | null
  attributes: { id: number; label: string }[]
  thumbnailUrl: string | null
}

export async function searchExtras(filters: unknown) {
  const production = await getCurrentProduction()
  if (!production) return { error: 'לא נמצאה הפקה' }

  const parsed = searchFiltersSchema.safeParse(filters)
  if (!parsed.success) return { error: 'פרמטרים לא תקינים' }

  const f = parsed.data

  // Build base conditions
  const conditions = [
    eq(extras.productionId, production.id),
    isNull(extras.deletedAt),
  ]

  if (f.q) {
    conditions.push(
      or(
        ilike(extras.fullName, `%${f.q}%`),
        ilike(extras.notes, `%${f.q}%`)
      )!
    )
  }
  if (f.gender !== undefined) conditions.push(eq(extras.gender, f.gender))
  if (f.minAge !== undefined) conditions.push(gte(extras.age, f.minAge))
  if (f.maxAge !== undefined) conditions.push(lte(extras.age, f.maxAge))
  if (f.hasCar) conditions.push(eq(extras.hasCar, true))

  // Attribute AND filter: extra must have ALL selected attributes
  if (f.attributeIds && f.attributeIds.length > 0) {
    const attrRows = await db
      .select({ extraId: extraAttributes.extraId })
      .from(extraAttributes)
      .where(inArray(extraAttributes.attributeId, f.attributeIds))
      .groupBy(extraAttributes.extraId)
      .having(
        sql`count(distinct ${extraAttributes.attributeId}) = ${f.attributeIds.length}`
      )

    const ids = attrRows.map((r) => r.extraId)
    if (ids.length === 0) return { data: [] as SearchResult[] }
    conditions.push(inArray(extras.id, ids))
  }

  // Availability filter: extra must have explicit isAvailable=true row for that date
  if (f.availableOnDate) {
    const availRows = await db
      .select({ extraId: availability.extraId })
      .from(availability)
      .where(
        and(
          eq(availability.date, f.availableOnDate),
          eq(availability.isAvailable, true)
        )
      )

    const ids = availRows.map((r) => r.extraId)
    if (ids.length === 0) return { data: [] as SearchResult[] }
    conditions.push(inArray(extras.id, ids))
  }

  // Fetch matched extras
  const matchedExtras = await db
    .select()
    .from(extras)
    .where(and(...conditions))
    .orderBy(extras.fullName)

  if (matchedExtras.length === 0) return { data: [] as SearchResult[] }

  const extraIds = matchedExtras.map((e) => e.id)

  // Batch-fetch attributes
  const attrRows = await db
    .select({
      extraId: extraAttributes.extraId,
      id: attributeOptions.id,
      label: attributeOptions.label,
    })
    .from(extraAttributes)
    .innerJoin(
      attributeOptions,
      eq(extraAttributes.attributeId, attributeOptions.id)
    )
    .where(inArray(extraAttributes.extraId, extraIds))

  const attrsByExtraId: Record<number, { id: number; label: string }[]> = {}
  for (const row of attrRows) {
    if (!attrsByExtraId[row.extraId]) attrsByExtraId[row.extraId] = []
    attrsByExtraId[row.extraId].push({ id: row.id, label: row.label })
  }

  // Batch-fetch primary photos (sortOrder = 0)
  const primaryPhotos = await db
    .select({ extraId: photos.extraId, r2Key: photos.r2Key })
    .from(photos)
    .where(and(inArray(photos.extraId, extraIds), eq(photos.sortOrder, 0)))

  const photoMap: Record<number, string> = {}
  for (const p of primaryPhotos) {
    photoMap[p.extraId] = p.r2Key
  }

  // Generate presigned GET URLs
  const urlMap: Record<number, string> = {}
  await Promise.all(
    Object.entries(photoMap).map(async ([extraIdStr, r2Key]) => {
      const extraId = Number(extraIdStr)
      try {
        urlMap[extraId] = await generatePresignedGetUrl(r2Key)
      } catch {
        // If URL generation fails, skip — thumbnail will show placeholder
      }
    })
  )

  const results: SearchResult[] = matchedExtras.map((e) => ({
    id: e.id,
    fullName: e.fullName,
    age: e.age,
    gender: e.gender,
    hasCar: e.hasCar,
    isFavorite: e.isFavorite,
    phone: e.phone,
    attributes: attrsByExtraId[e.id] ?? [],
    thumbnailUrl: urlMap[e.id] ?? null,
  }))

  return { data: results }
}
