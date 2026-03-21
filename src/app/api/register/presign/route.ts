import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/db'
import { registrationTokens } from '@/db/schema/registration-tokens'
import { photos } from '@/db/schema/photos'
import { eq } from 'drizzle-orm'
import { generatePresignedUploadUrl } from '@/lib/r2'

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-registration-token')
  if (!token) {
    return NextResponse.json({ error: 'טוקן חסר' }, { status: 401 })
  }

  // Validate token
  const tokenResult = await db
    .select()
    .from(registrationTokens)
    .where(eq(registrationTokens.token, token))
    .limit(1)

  if (!tokenResult[0] || !tokenResult[0].isActive) {
    return NextResponse.json({ error: 'הקישור אינו תקף' }, { status: 401 })
  }

  const body = await req.json()
  const extraId = Number(body.extraId)
  if (!extraId || isNaN(extraId)) {
    return NextResponse.json({ error: 'extraId לא תקין' }, { status: 400 })
  }

  // Enforce max 3 photos for public registration
  const existing = await db
    .select({ id: photos.id })
    .from(photos)
    .where(eq(photos.extraId, extraId))

  if (existing.length >= 3) {
    return NextResponse.json({ error: 'מקסימום 3 תמונות מותר' }, { status: 400 })
  }

  const key = `extras/${extraId}/${Date.now()}-${randomUUID()}.webp`
  const uploadUrl = await generatePresignedUploadUrl(key)

  return NextResponse.json({ uploadUrl, key })
}
