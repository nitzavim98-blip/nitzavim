import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as usersSchema from './schema/users'
import * as productionsSchema from './schema/productions'
import * as attributeOptionsSchema from './schema/attribute-options'
import * as extrasSchema from './schema/extras'
import * as extraAttributesSchema from './schema/extra-attributes'
import * as photosSchema from './schema/photos'
import * as availabilitySchema from './schema/availability'
import * as shootingDaysSchema from './schema/shooting-days'
import * as scenesSchema from './schema/scenes'
import * as extraScenesSchema from './schema/extra-scenes'
import * as registrationTokensSchema from './schema/registration-tokens'

const schema = {
  ...usersSchema,
  ...productionsSchema,
  ...attributeOptionsSchema,
  ...extrasSchema,
  ...extraAttributesSchema,
  ...photosSchema,
  ...availabilitySchema,
  ...shootingDaysSchema,
  ...scenesSchema,
  ...extraScenesSchema,
  ...registrationTokensSchema,
}

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
