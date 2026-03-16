import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core'
import { extras } from './extras'
import { attributeOptions } from './attribute-options'

export const extraAttributes = pgTable(
  'extra_attributes',
  {
    extraId: integer('extra_id')
      .notNull()
      .references(() => extras.id),
    attributeId: integer('attribute_id')
      .notNull()
      .references(() => attributeOptions.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.extraId, table.attributeId] }),
  })
)

export type ExtraAttribute = typeof extraAttributes.$inferSelect
