import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'
import { generatePresignedUploadUrl } from '@/lib/r2'
import { db } from '@/db'
import { photos } from '@/db/schema/photos'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const extraId = Number(body.extraId)

  if (!extraId || isNaN(extraId)) {
    return NextResponse.json({ error: 'Invalid extraId' }, { status: 400 })
  }

  // Enforce max 5 photos
  const existing = await db
    .select({ id: photos.id })
    .from(photos)
    .where(eq(photos.extraId, extraId))

  if (existing.length >= 5) {
    return NextResponse.json({ error: 'מקסימום 5 תמונות מותר' }, { status: 400 })
  }

  const key = `extras/${extraId}/${Date.now()}-${randomUUID()}.webp`
  const uploadUrl = await generatePresignedUploadUrl(key)

  return NextResponse.json({ uploadUrl, key })
}
