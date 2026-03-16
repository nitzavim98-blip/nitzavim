# ExtraCast — DATA_MODEL.md
# Data Model Reference

**Version**: 1.0  
**Status**: Active  
**Last Updated**: March 2026

---

## 1. Overview

ExtraCast uses a single **Neon Postgres** database accessed via **Drizzle ORM**. All schema is defined in `src/db/schema/` — one file per table. No raw SQL anywhere in the codebase.

### Table Inventory

| Table | File | Purpose |
|-------|------|---------|
| `productions` | `productions.ts` | Top-level production container, owned by a user |
| `extras` | `extras.ts` | Core extras roster, scoped to a production |
| `photos` | `photos.ts` | Photo attachments per extra |
| `attribute_options` | `attribute-options.ts` | Canonical attribute list (pre-seeded + custom) |
| `extra_attributes` | `extra-attributes.ts` | Junction: extras ↔ attribute_options (many-to-many) |
| `availability` | `availability.ts` | Per-extra date availability |
| `shooting_days` | `shooting-days.ts` | Shooting day records, scoped to a production |
| `scenes` | `scenes.ts` | Scenes within a shooting day |
| `extra_scenes` | `extra-scenes.ts` | Junction: extras assigned to scenes |
| `registration_tokens` | `registration-tokens.ts` | Public form access tokens |
| `users` | `users.ts` | Director/admin/guest accounts |

---

## 2. Entity Relationship Diagram

```
users
  │
  └── owns one ──────────────► productions
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
                 extras        shooting_days   registration_tokens
                    │               │
                    │               └── has many ──► scenes
                    │                                   │
                    │                                   └── has many ──► extra_scenes ◄── extras
                    │
                    ├── has many ──► photos
                    │
                    ├── has many ──► availability
                    │
                    └── many-to-many ──► extra_attributes ◄── attribute_options
```

**Key structural rules:**
- A `user` owns exactly **one** `production`
- A `production` is the root scope for `extras`, `shooting_days`, and `registration_tokens`
- `scenes` belong to `shooting_days`
- `extras` are assigned to `scenes` via the `extra_scenes` junction
- `extras` have physical attributes via the `extra_attributes` junction (many-to-many with `attribute_options`)
- `attribute_options` are shared across all extras — not duplicated per extra

---

## 3. Table Definitions

---

### 3.1 `productions`

The top-level container. Every piece of data in the system belongs to a production. A user owns exactly one production.

```typescript
// src/db/schema/productions.ts
import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core'

export const productions = pgTable('productions', {
  id:        serial('id').primaryKey(),
  userId:    integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  name:      varchar('name', { length: 255 }).notNull(),   // e.g. "סדרה עונה 2"
  title:     varchar('title', { length: 255 }),             // working/display title, nullable
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial PK | no | |
| `userId` | integer FK | no | → `users.id`. Unique — one production per user. Cascades |
| `name` | varchar(255) | no | Internal production name |
| `title` | varchar(255) | yes | Display/working title, can differ from name |
| `createdAt` | timestamp | no | |
| `updatedAt` | timestamp | no | |

**Business Rules:**
- Created automatically on first login if none exists for the user
- A user can never have more than one production — enforced by the `UNIQUE` constraint on `userId`
- Deleting a production cascades to all `extras`, `shooting_days`, and `registration_tokens`

**Indexes:**
```sql
CREATE UNIQUE INDEX productions_user_id_idx ON productions (user_id);
```

---

### 3.2 `extras`

The central table. Every extra registered in the system has one row here, scoped to a production.

```typescript
// src/db/schema/extras.ts
import { pgTable, serial, varchar, integer, boolean, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const sourceEnum = pgEnum('extra_source', ['manual', 'public_form'])

export const extras = pgTable('extras', {
  id:           serial('id').primaryKey(),
  productionId: integer('production_id').notNull().references(() => productions.id, { onDelete: 'cascade' }),
  fullName:     varchar('full_name', { length: 255 }).notNull(),
  phone:        varchar('phone', { length: 20 }),
  email:        varchar('email', { length: 255 }),
  age:          integer('age'),
  gender:       integer('gender').default(1).notNull(),      // 1 = male, 0 = female
  height:       integer('height'),                           // cm
  weight:       integer('weight'),                           // kg
  hasCar:       boolean('has_car').default(false).notNull(),
  reliability:  integer('reliability').default(2).notNull(), // 0 = לא אמין, 1 = בסדר, 2 = אמין
  notes:        text('notes'),
  isFavorite:   boolean('is_favorite').default(false).notNull(),
  source:       sourceEnum('source').default('manual').notNull(),
  deletedAt:    timestamp('deleted_at'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
})
```

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial PK | no | Auto-increment |
| `productionId` | integer FK | no | → `productions.id`. Scopes extra to a production. Cascades |
| `fullName` | varchar(255) | no | Required on all registration paths |
| `phone` | varchar(20) | yes | Primary contact method |
| `email` | varchar(255) | yes | Optional — not collected on public form by default |
| `age` | integer | yes | Director can leave blank |
| `gender` | integer | no | `1` = male, `0` = female. Default `1` |
| `height` | integer | yes | Centimeters |
| `weight` | integer | yes | Kilograms |
| `hasCar` | boolean | no | Default `false` |
| `reliability` | integer | no | `0` = לא אמין, `1` = בסדר, `2` = אמין. Default `2` |
| `notes` | text | yes | Free-text director notes |
| `isFavorite` | boolean | no | Star toggle. Default `false` |
| `source` | enum | no | `'manual'` or `'public_form'` |
| `deletedAt` | timestamp | yes | Soft delete. `NULL` = active |
| `createdAt` | timestamp | no | |
| `updatedAt` | timestamp | no | |

**Soft Delete Behavior:**
- Deletion sets `deletedAt = NOW()` — the row is never physically removed
- All queries filter `WHERE deleted_at IS NULL` by default
- This preserves referential integrity with `extra_scenes` on archived shooting days
- Hard deletion is not supported at the application layer

**Indexes:**
```sql
CREATE INDEX extras_production_id_idx ON extras (production_id);
CREATE INDEX extras_deleted_at_idx ON extras (deleted_at);
CREATE INDEX extras_is_favorite_idx ON extras (is_favorite);
CREATE INDEX extras_gender_idx ON extras (gender);
```

---

### 3.3 `photos`

Up to 5 photos per extra, stored as R2 object keys.

```typescript
// src/db/schema/photos.ts
export const photos = pgTable('photos', {
  id:        serial('id').primaryKey(),
  extraId:   integer('extra_id').notNull().references(() => extras.id, { onDelete: 'cascade' }),
  r2Key:     varchar('r2_key', { length: 500 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial PK | no | |
| `extraId` | integer FK | no | → `extras.id`. Cascades on hard delete |
| `r2Key` | varchar(500) | no | R2 object key, e.g. `extras/42/1709123456-uuid.webp` |
| `sortOrder` | integer | no | `0` = primary photo shown as thumbnail. Max 4 |
| `createdAt` | timestamp | no | |

**Business Rules:**
- Maximum 5 photos per extra — enforced at application layer before insert
- `sortOrder` values are `0` through `4`
- When a photo is deleted: the DB row is removed AND the R2 object is deleted via `/api/upload/delete`
- The photo with `sortOrder = 0` is used as the thumbnail in the extras list
- When reordering, all affected `sortOrder` values are updated in a single transaction

**Indexes:**
```sql
CREATE INDEX photos_extra_id_idx ON photos (extra_id);
CREATE INDEX photos_extra_sort_idx ON photos (extra_id, sort_order);
```

---

### 3.4 `attribute_options`

The canonical list of physical attribute labels. Shared across all extras via the `extra_attributes` junction table. Pre-seeded with standard values; directors can add custom entries.

```typescript
// src/db/schema/attribute-options.ts
export const attributeOptions = pgTable('attribute_options', {
  id:    serial('id').primaryKey(),
  label: varchar('label', { length: 100 }).notNull().unique(),
})
```

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial PK | no | |
| `label` | varchar(100) | no | Unique attribute label, e.g. `"מראה אירופאי"` |

**Pre-seeded values:**
```
מראה אירופאי, מראה מזרחי, מראה אתיופי, מראה רוסי,
בלונדיני, ג'ינג'י, קעקועים, ללא קעקועים,
שמנמן, רזה, שרירי, גבוה, נמוך,
זקן, צעיר, עם משקפיים, עם זקן, מגולח,
שיער ארוך, שיער קצר, קרח,
אלגנטי, ספורטיבי, היפי, דתי, חרדי
```

**Business Rules:**
- Each label is globally unique — no duplicates in the options list
- New custom attributes added by the director create a new row here, which is then linked via `extra_attributes`
- Attributes are not scoped per production — they are shared globally across the app instance
- Deleting an `attribute_options` row cascades to all `extra_attributes` rows referencing it

**Indexes:**
```sql
CREATE UNIQUE INDEX attribute_options_label_idx ON attribute_options (label);
```

---

### 3.5 `extra_attributes` (junction)

Links extras to their physical attributes. Replaces the old denormalized `physical_attributes` table with a proper many-to-many relationship.

```typescript
// src/db/schema/extra-attributes.ts
export const extraAttributes = pgTable('extra_attributes', {
  extraId:     integer('extra_id').notNull().references(() => extras.id, { onDelete: 'cascade' }),
  attributeId: integer('attribute_id').notNull().references(() => attributeOptions.id, { onDelete: 'cascade' }),
},
(table) => ({
  pk: primaryKey({ columns: [table.extraId, table.attributeId] }),
}))
```

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `extraId` | integer FK | no | → `extras.id`. Cascades |
| `attributeId` | integer FK | no | → `attribute_options.id`. Cascades |
| PK | composite | — | `(extraId, attributeId)` — no duplicate assignments |

**Business Rules:**
- No serial `id` column — the composite PK is sufficient
- An extra can have any number of attributes
- The same attribute can be assigned to any number of extras
- Physical attributes are **not** collected on the public registration form — the director adds them manually after reviewing a new extra
- Removing an attribute assignment deletes the junction row only — neither the extra nor the attribute_option is affected

**Indexes:**
```sql
-- Composite PK covers (extra_id, attribute_id) lookups
CREATE INDEX extra_attributes_attribute_id_idx ON extra_attributes (attribute_id);
```

---

### 3.6 `availability`

One row per extra per date, marking whether they are available.

```typescript
// src/db/schema/availability.ts
import { date } from 'drizzle-orm/pg-core'

export const availability = pgTable('availability', {
  id:          serial('id').primaryKey(),
  extraId:     integer('extra_id').notNull().references(() => extras.id, { onDelete: 'cascade' }),
  date:        date('date').notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  note:        varchar('note', { length: 255 }),
},
(table) => ({
  uniqueExtraDate: unique().on(table.extraId, table.date),
}))
```

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial PK | no | |
| `extraId` | integer FK | no | → `extras.id`. Cascades |
| `date` | date | no | ISO date, no time component |
| `isAvailable` | boolean | no | `true` = available, `false` = unavailable |
| `note` | varchar(255) | yes | Optional reason, e.g. `"חופשה"` |

**Business Rules:**
- Unique constraint on `(extraId, date)` — one row per extra per day
- Absence of a row for a date means no information (not the same as unavailable)
- The search filter "available on date X" matches extras where a row exists with `isAvailable = true`
- Date values use `date` type (not `timestamp`) — no timezone complexity

**Indexes:**
```sql
CREATE INDEX availability_extra_id_idx ON availability (extra_id);
CREATE INDEX availability_date_idx ON availability (date);
CREATE UNIQUE INDEX availability_extra_date_unique ON availability (extra_id, date);
```

---

### 3.7 `shooting_days`

One row per shooting day, scoped to a production.

```typescript
// src/db/schema/shooting-days.ts
export const shootingDays = pgTable('shooting_days', {
  id:           serial('id').primaryKey(),
  productionId: integer('production_id').notNull().references(() => productions.id, { onDelete: 'cascade' }),
  date:         date('date').notNull(),
  title:        varchar('title', { length: 255 }),
  location:     varchar('location', { length: 255 }),
  notes:        text('notes'),
  isArchived:   boolean('is_archived').default(false).notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
})
```

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial PK | no | |
| `productionId` | integer FK | no | → `productions.id`. Scopes day to a production. Cascades |
| `date` | date | no | The shooting date |
| `title` | varchar(255) | yes | Optional label, e.g. `"סצנות בית"` |
| `location` | varchar(255) | yes | Shoot location |
| `notes` | text | yes | Director's free-text notes |
| `isArchived` | boolean | no | `true` = past/closed day. Default `false` |
| `createdAt` | timestamp | no | |
| `updatedAt` | timestamp | no | |

**Business Rules:**
- No unique constraint on `date` — a production could have multiple units on the same date
- Archiving sets `isArchived = true` — archived days are read-only in the UI
- Deleting a shooting day cascades to its scenes, which cascade to `extra_scenes`
- The dashboard queries by `productionId` + date to find today's and tomorrow's days

**Indexes:**
```sql
CREATE INDEX shooting_days_production_id_idx ON shooting_days (production_id);
CREATE INDEX shooting_days_date_idx ON shooting_days (date);
CREATE INDEX shooting_days_archived_idx ON shooting_days (is_archived);
```

---

### 3.8 `scenes`

Each scene belongs to one shooting day. A shooting day has many scenes.

```typescript
// src/db/schema/scenes.ts
export const scenes = pgTable('scenes', {
  id:             serial('id').primaryKey(),
  shootingDayId:  integer('shooting_day_id').notNull().references(() => shootingDays.id, { onDelete: 'cascade' }),
  title:          varchar('title', { length: 255 }).notNull(),
  description:    text('description'),
  sortOrder:      integer('sort_order').notNull().default(0),
  requiredExtras: integer('required_extras').notNull().default(0),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
})
```

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial PK | no | |
| `shootingDayId` | integer FK | no | → `shooting_days.id`. Cascades |
| `title` | varchar(255) | no | Scene name, e.g. `"סצנת בית הקפה"` |
| `description` | text | yes | Look, situation, costume notes |
| `sortOrder` | integer | no | Display order within the day |
| `requiredExtras` | integer | no | Target headcount. `0` = unset |
| `createdAt` | timestamp | no | |

**Business Rules:**
- `requiredExtras` is a planning target — it does not enforce any constraint on `extra_scenes`
- Gap detection: `requiredExtras - COUNT(extra_scenes WHERE status IN ('confirmed', 'arrived'))` = gap
- When duplicating a scene to another day: copy `title`, `description`, `requiredExtras`, `sortOrder` — do NOT copy `extra_scenes` assignments
- `sortOrder` reordering updates all affected rows in one transaction

**Indexes:**
```sql
CREATE INDEX scenes_shooting_day_id_idx ON scenes (shooting_day_id);
CREATE INDEX scenes_shooting_day_sort_idx ON scenes (shooting_day_id, sort_order);
```

---

### 3.9 `extra_scenes` (junction)

Links extras to scenes. One row = one extra assigned to one scene.

```typescript
// src/db/schema/extra-scenes.ts
export const statusEnum = pgEnum('extra_scene_status', [
  'proposed',
  'contacted',
  'confirmed',
  'arrived',
])

export const extraScenes = pgTable('extra_scenes', {
  id:        serial('id').primaryKey(),
  extraId:   integer('extra_id').notNull().references(() => extras.id, { onDelete: 'cascade' }),
  sceneId:   integer('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  status:    statusEnum('status').default('proposed').notNull(),
  look:      varchar('look', { length: 255 }),
  situation: varchar('situation', { length: 255 }),
  notes:     text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
(table) => ({
  uniqueExtraScene: unique().on(table.extraId, table.sceneId),
}))
```

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial PK | no | |
| `extraId` | integer FK | no | → `extras.id`. Cascades |
| `sceneId` | integer FK | no | → `scenes.id`. Cascades |
| `status` | enum | no | See status flow below |
| `look` | varchar(255) | yes | Costume/appearance note for this scene |
| `situation` | varchar(255) | yes | What the extra does in this scene |
| `notes` | text | yes | Per-assignment director notes |
| `createdAt` | timestamp | no | |

**Status Flow:**
```
proposed → contacted → confirmed → arrived
   (הוצע)  (נשלחה הודעה)  (אישר)    (הגיע)
```

- Status only moves forward in normal use — no DB constraint, UI enforces direction
- `confirmed` + `arrived` count toward filling `scenes.requiredExtras`
- `proposed` and `contacted` are not counted as "filled" for gap detection

**Business Rules:**
- Unique constraint on `(extraId, sceneId)` — an extra can only be assigned once per scene
- An extra CAN appear in multiple scenes on the same shooting day
- Removing an extra from a scene deletes the row — no soft delete here
- `look` and `situation` are per-assignment, not global to the extra

**Indexes:**
```sql
CREATE INDEX extra_scenes_extra_id_idx ON extra_scenes (extra_id);
CREATE INDEX extra_scenes_scene_id_idx ON extra_scenes (scene_id);
CREATE INDEX extra_scenes_status_idx ON extra_scenes (status);
CREATE UNIQUE INDEX extra_scenes_unique ON extra_scenes (extra_id, scene_id);
```

---

### 3.10 `registration_tokens`

Tokens that authorize access to the public self-registration form. Scoped to a production.

```typescript
// src/db/schema/registration-tokens.ts
export const registrationTokens = pgTable('registration_tokens', {
  id:           serial('id').primaryKey(),
  productionId: integer('production_id').notNull().references(() => productions.id, { onDelete: 'cascade' }),
  token:        varchar('token', { length: 64 }).notNull().unique(),
  isActive:     boolean('is_active').default(true).notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})
```

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial PK | no | |
| `productionId` | integer FK | no | → `productions.id`. Cascades |
| `token` | varchar(64) | no | URL-safe random string. Unique |
| `isActive` | boolean | no | `false` = form is disabled for this token |
| `createdAt` | timestamp | no | |

**Business Rules:**
- The director generates a token and shares `/register/{token}` with extras
- Token validation happens in middleware before the page renders
- `isActive = false` disables the link without deleting the token
- No expiry date in v1 — tokens are valid until manually deactivated
- Multiple tokens can be active simultaneously

**Indexes:**
```sql
CREATE UNIQUE INDEX registration_tokens_token_idx ON registration_tokens (token);
CREATE INDEX registration_tokens_production_id_idx ON registration_tokens (production_id);
```

---

### 3.11 `users`

Director and admin accounts. Managed by NextAuth.js.

```typescript
// src/db/schema/users.ts
export const roleEnum = pgEnum('user_role', ['admin', 'director', 'guest'])

export const users = pgTable('users', {
  id:             serial('id').primaryKey(),
  name:           varchar('name', { length: 255 }).notNull(),
  email:          varchar('email', { length: 255 }).notNull().unique(),
  hashedPassword: varchar('hashed_password', { length: 255 }),
  image:          varchar('image', { length: 500 }),
  role:           roleEnum('role').default('director').notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
})
```

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial PK | no | |
| `name` | varchar(255) | no | Display name |
| `email` | varchar(255) | no | Unique. Used as login identifier |
| `hashedPassword` | varchar(255) | yes | Not used — always `NULL` (Google OAuth only) |
| `image` | varchar(500) | yes | Google profile photo URL |
| `role` | enum | no | `'admin'`, `'director'`, `'guest'`. Default `'director'` |
| `createdAt` | timestamp | no | |
| `updatedAt` | timestamp | no | |

**Business Rules:**
- New users are assigned `role: 'director'` automatically on first sign-in
- A `productions` row is created automatically for the user on first sign-in
- Role changes require an `admin` user acting through the settings page
- Only Google OAuth is supported — `hashedPassword` is always `NULL` and unused

**Indexes:**
```sql
CREATE UNIQUE INDEX users_email_idx ON users (email);
```

---

## 4. Relationships Summary

| Relationship | Type | FK / Junction | On Delete |
|-------------|------|---------------|-----------|
| `users` → `productions` | one-to-one | `productions.user_id` | CASCADE |
| `productions` → `extras` | one-to-many | `extras.production_id` | CASCADE |
| `productions` → `shooting_days` | one-to-many | `shooting_days.production_id` | CASCADE |
| `productions` → `registration_tokens` | one-to-many | `registration_tokens.production_id` | CASCADE |
| `extras` → `photos` | one-to-many | `photos.extra_id` | CASCADE |
| `extras` → `availability` | one-to-many | `availability.extra_id` | CASCADE |
| `extras` ↔ `attribute_options` | many-to-many | `extra_attributes` junction | CASCADE both sides |
| `extras` ↔ `scenes` | many-to-many | `extra_scenes` junction | CASCADE both sides |
| `shooting_days` → `scenes` | one-to-many | `scenes.shooting_day_id` | CASCADE |

> All cascade deletes apply to **physical** row deletion. Because `extras` uses soft delete (`deletedAt`), cascades on `photos`, `availability`, `extra_attributes`, and `extra_scenes` will only fire if a row is hard-deleted at the database level — which is not exposed through the application in v1.

---

## 5. Key Business Rules (Consolidated)

| Rule | Where Enforced |
|------|---------------|
| One production per user | DB unique constraint on `productions.user_id` |
| Production created automatically on first sign-in | Application layer (NextAuth callback) |
| `extras` and `shooting_days` always scoped to a production | DB FK + Server Action always passes `productionId` |
| Max 5 photos per extra | Application layer (Server Action checks count before insert) |
| One availability row per extra per date | DB unique constraint |
| One attribute assignment per extra per attribute | DB composite PK on `extra_attributes` |
| One assignment per extra per scene | DB unique constraint on `extra_scenes` |
| Extras are never hard-deleted | Application layer (Server Action sets `deletedAt` only) |
| Physical attributes not on public form | Application layer (registration action excludes this field) |
| Scene duplication copies details, not assignments | Application layer (duplicate action omits `extra_scenes`) |
| Status flow is forward-only | UI layer only — no DB constraint |
| Gap = `requiredExtras` minus confirmed+arrived count | Computed at query time, not stored |
| Max 10 registrations per IP per hour | Upstash rate limit on `/register/[token]` |
| Archived shooting days are read-only | UI layer (edit controls hidden when `isArchived = true`) |

---

## 6. Computed Values (Not Stored)

| Value | Calculation |
|-------|------------|
| Scene gap count | `scenes.required_extras - COUNT(extra_scenes WHERE status IN ('confirmed', 'arrived'))` |
| Extras assigned to scene | `COUNT(extra_scenes WHERE scene_id = ?)` |
| Extra's scene count | `COUNT(extra_scenes WHERE extra_id = ?)` |
| Extra's attribute list | `JOIN extra_attributes → attribute_options WHERE extra_id = ?` |
| Presigned photo URLs | Generated on demand per request, TTL 1 hour, cached in client state |
| Today's / tomorrow's shooting day | `WHERE production_id = ? AND date = CURRENT_DATE` / `+ 1` |

---

## 7. Drizzle Schema File Index

```
src/db/
├── index.ts                       # Drizzle client init + Neon connection
├── schema/
│   ├── users.ts                   # users table + roleEnum
│   ├── productions.ts             # productions table
│   ├── extras.ts                  # extras table + sourceEnum
│   ├── photos.ts                  # photos table
│   ├── attribute-options.ts       # attribute_options table (canonical list + seed)
│   ├── extra-attributes.ts        # extra_attributes junction table (extras ↔ attributes)
│   ├── availability.ts            # availability table
│   ├── shooting-days.ts           # shooting_days table
│   ├── scenes.ts                  # scenes table
│   ├── extra-scenes.ts            # extra_scenes junction table + statusEnum
│   └── registration-tokens.ts     # registration_tokens table
└── migrations/
    └── ...                        # generated by drizzle-kit
```

**Schema dependency order** (for migrations and imports):
1. `users`
2. `productions` (depends on `users`)
3. `extras` (depends on `productions`)
4. `attribute-options` (no dependencies)
5. `extra-attributes` (depends on `extras`, `attribute-options`)
6. `photos` (depends on `extras`)
7. `availability` (depends on `extras`)
8. `shooting-days` (depends on `productions`)
9. `scenes` (depends on `shooting-days`)
10. `extra-scenes` (depends on `extras`, `scenes`)
11. `registration-tokens` (depends on `productions`)

All enums (`sourceEnum`, `statusEnum`, `roleEnum`) are defined in their owning table's schema file and exported for use in queries and TypeScript types.