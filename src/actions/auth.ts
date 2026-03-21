'use server'

import { auth } from '@/lib/auth'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { productions } from '@/db/schema/productions'
import { eq, asc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { z } from 'zod'

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

export async function getUsers() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'admin') {
    return { error: 'אין לך הרשאה לצפות ברשימת המשתמשים' }
  }

  const result = await db
    .select()
    .from(users)
    .orderBy(asc(users.createdAt))

  return { data: result }
}

const updateUserRoleSchema = z.object({
  userId: z.number().int().positive(),
  newRole: z.enum(['admin', 'director', 'guest']),
})

export async function updateUserRole(userId: number, newRole: 'admin' | 'director' | 'guest') {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'admin') {
    return { error: 'אין לך הרשאה לשנות תפקידי משתמשים' }
  }

  if (currentUser.id === userId) {
    return { error: 'אינך יכול לשנות את התפקיד שלך' }
  }

  const parsed = updateUserRoleSchema.safeParse({ userId, newRole })
  if (!parsed.success) {
    return { error: 'נתונים לא תקינים' }
  }

  const [updated] = await db
    .update(users)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning()

  if (!updated) {
    return { error: 'המשתמש לא נמצא' }
  }

  return { data: updated }
}
