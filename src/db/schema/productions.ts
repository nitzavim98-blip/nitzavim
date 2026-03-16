import { pgTable, serial, integer, varchar, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const productions = pgTable('productions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Production = typeof productions.$inferSelect
export type NewProduction = typeof productions.$inferInsert
