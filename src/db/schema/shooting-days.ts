import { pgTable, serial, integer, date, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { productions } from './productions'

export const shootingDays = pgTable('shooting_days', {
  id: serial('id').primaryKey(),
  productionId: integer('production_id')
    .notNull()
    .references(() => productions.id),
  date: date('date').notNull(),
  title: varchar('title', { length: 255 }),
  location: varchar('location', { length: 255 }),
  notes: text('notes'),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type ShootingDay = typeof shootingDays.$inferSelect
export type NewShootingDay = typeof shootingDays.$inferInsert
