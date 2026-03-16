'use server'

import { auth } from '@/lib/auth'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { productions } from '@/db/schema/productions'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.email) return null

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1)

  return result[0] ?? null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

export async function ensureProductionExists(userId: number) {
  const existing = await db
    .select()
    .from(productions)
    .where(eq(productions.userId, userId))
    .limit(1)

  if (existing.length > 0) return existing[0]

  const [created] = await db
    .insert(productions)
    .values({ userId, name: 'ההפקה שלי' })
    .returning()

  return created
}

export async function getCurrentProduction() {
  const user = await getCurrentUser()
  if (!user) return null

  const result = await db
    .select()
    .from(productions)
    .where(eq(productions.userId, user.id))
    .limit(1)

  return result[0] ?? null
}
