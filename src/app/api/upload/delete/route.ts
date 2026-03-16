import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { deleteR2Object } from '@/lib/r2'

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { key } = body

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  await deleteR2Object(key)
  return NextResponse.json({ success: true })
}
