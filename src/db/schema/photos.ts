import { pgTable, serial, integer, varchar, timestamp } from 'drizzle-orm/pg-core'
import { extras } from './extras'

export const photos = pgTable('photos', {
  id: serial('id').primaryKey(),
  extraId: integer('extra_id')
    .notNull()
    .references(() => extras.id),
  r2Key: varchar('r2_key', { length: 500 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Photo = typeof photos.$inferSelect
export type NewPhoto = typeof photos.$inferInsert
