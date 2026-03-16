import { pgTable, serial, integer, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { extras } from './extras'
import { scenes } from './scenes'

export const extraSceneStatusEnum = pgEnum('extra_scene_status', [
  'proposed',
  'contacted',
  'confirmed',
  'arrived',
])

export const extraScenes = pgTable('extra_scenes', {
  id: serial('id').primaryKey(),
  extraId: integer('extra_id')
    .notNull()
    .references(() => extras.id),
  sceneId: integer('scene_id')
    .notNull()
    .references(() => scenes.id),
  status: extraSceneStatusEnum('status').default('proposed').notNull(),
  look: varchar('look', { length: 255 }),
  situation: varchar('situation', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type ExtraScene = typeof extraScenes.$inferSelect
export type NewExtraScene = typeof extraScenes.$inferInsert
