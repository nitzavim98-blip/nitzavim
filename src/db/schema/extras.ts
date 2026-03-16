import { pgTable, serial, integer, varchar, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { productions } from './productions'

export const sourceEnum = pgEnum('source', ['manual', 'public_form'])

export const extras = pgTable('extras', {
  id: serial('id').primaryKey(),
  productionId: integer('production_id')
    .notNull()
    .references(() => productions.id),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  age: integer('age'),
  gender: integer('gender').default(1).notNull(), // 1 = male, 0 = female
  height: integer('height'), // cm
  weight: integer('weight'), // kg
  hasCar: boolean('has_car').default(false).notNull(),
  reliability: integer('reliability').default(2).notNull(), // 0 = לא אמין, 1 = בסדר, 2 = אמין
  notes: text('notes'),
  isFavorite: boolean('is_favorite').default(false).notNull(),
  source: sourceEnum('source').default('manual').notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Extra = typeof extras.$inferSelect
export type NewExtra = typeof extras.$inferInsert
