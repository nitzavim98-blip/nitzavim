import { pgTable, serial, varchar } from 'drizzle-orm/pg-core'

export const attributeOptions = pgTable('attribute_options', {
  id: serial('id').primaryKey(),
  label: varchar('label', { length: 100 }).notNull().unique(),
})

export type AttributeOption = typeof attributeOptions.$inferSelect
export type NewAttributeOption = typeof attributeOptions.$inferInsert
