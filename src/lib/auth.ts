import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { productions } from '@/db/schema/productions'
import { eq } from 'drizzle-orm'

async function ensureProductionExists(userId: number) {
  const existing = await db
    .select()
    .from(productions)
    .where(eq(productions.userId, userId))
    .limit(1)

  if (existing.length === 0) {
    await db.insert(productions).values({
      userId,
      name: 'ההפקה שלי',
    })
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return false
      if (!user.email) return false

      // Upsert user in DB
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)

      if (existing.length === 0) {
        await db.insert(users).values({
          name: user.name ?? '',
          email: user.email,
          image: user.image ?? null,
          role: 'director',
        })
      } else {
        // Update image if changed
        if (user.image && user.image !== existing[0].image) {
          await db
            .update(users)
            .set({ image: user.image, updatedAt: new Date() })
            .where(eq(users.email, user.email))
        }
      }

      // Ensure production exists
      const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)

      if (dbUser.length > 0) {
        await ensureProductionExists(dbUser[0].id)
      }

      return true
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1)

        if (dbUser.length > 0) {
          token.userId = dbUser[0].id
          token.role = dbUser[0].role
        }
      }
      return token
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = String(token.userId)
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
