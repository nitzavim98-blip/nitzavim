import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { shootingDays } from './shooting-days'

export const scenes = pgTable('scenes', {
  id: serial('id').primaryKey(),
  shootingDayId: integer('shooting_day_id')
    .notNull()
    .references(() => shootingDays.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0).notNull(),
  requiredExtras: integer('required_extras').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Scene = typeof scenes.$inferSelect
export type NewScene = typeof scenes.$inferInsert
