import { pgTable, serial, integer, date, boolean, varchar } from 'drizzle-orm/pg-core'
import { extras } from './extras'

export const availability = pgTable('availability', {
  id: serial('id').primaryKey(),
  extraId: integer('extra_id')
    .notNull()
    .references(() => extras.id),
  date: date('date').notNull(),
  isAvailable: boolean('is_available').notNull(),
  note: varchar('note', { length: 255 }),
})

export type Availability = typeof availability.$inferSelect
export type NewAvailability = typeof availability.$inferInsert
