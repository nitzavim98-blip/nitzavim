import { pgTable, serial, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'

export const registrationTokens = pgTable('registration_tokens', {
  id: serial('id').primaryKey(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type RegistrationToken = typeof registrationTokens.$inferSelect
export type NewRegistrationToken = typeof registrationTokens.$inferInsert
