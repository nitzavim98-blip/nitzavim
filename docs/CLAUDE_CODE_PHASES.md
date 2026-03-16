# ExtraCast — CLAUDE_CODE_PHASES.md
# Implementation Phases for Claude Code

**Version**: 1.0
**Status**: Active
**Last Updated**: March 2026

---

## How to Use This Document

This file is the authoritative build plan for ExtraCast. Work **strictly in phase order** — each phase produces a working, testable state before the next begins. Never skip a phase or work across phase boundaries simultaneously.

Before starting any phase:
1. Read the phase in full
2. Cross-reference `CLAUDE.md` for design system and architecture rules
3. Cross-reference `docs/FEATURES.md` for behavior details
4. Mark each file complete as you go

**Hard rules that apply to every phase:**
- CSS Modules only — never Tailwind, never inline styles, never global classes outside `globals.css`
- Every component gets its own `ComponentName/index.tsx` + `ComponentName/ComponentName.module.css` in its folder
- All text in Hebrew
- `dir="rtl"` is set at the HTML root — use CSS logical properties (`padding-inline-start`, not `padding-left`)
- Server Actions for all mutations and most data fetching — API routes only where noted
- Always validate with Zod in Server Actions even if the client already validated
- Loading states = skeleton components; empty states = centered icon + Hebrew message

---

## Phase Overview

| Phase | Name | Delivers |
|-------|------|----------|
| 1 | Foundation | Auth, DB, layout shell, login |
| 2 | Extras — Core CRUD | Extras list, add/edit form, delete |
| 3 | Extras — Rich Data | Attributes, availability, expandable sections |
| 4 | Photo System | R2 upload, display, photo management |
| 5 | Shooting Days & Scenes | Day management, scene cards |
| 6 | Scene Assignment & Status | Assign extras, status flow, WhatsApp export |
| 7 | Search | Filter page, results, assign from search |
| 8 | Dashboard | Today/tomorrow overview |
| 9 | Public Registration | Token-gated self-registration form |
| 10 | Settings & Polish | User mgmt, token mgmt, final audit |

---

## Phase 1 — Foundation ✅ DONE

**Goal**: A working Next.js app with Google auth, database connected, layout shell rendered, and the login page functional. Every authenticated page redirects to login if unauthenticated.

### 1.1 Install Dependencies

```bash
npm install next-auth@beta @auth/drizzle-adapter drizzle-orm @neondatabase/serverless
npm install lucide-react date-fns react-hot-toast
npm install -D drizzle-kit
```

### 1.2 Environment Setup

Create `.env.local` (never commit):
```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 1.3 Files to Create

**Database:**
```
src/db/index.ts                        # Drizzle client + Neon connection
src/db/schema/users.ts                 # users table + roleEnum
src/db/schema/productions.ts           # productions table
src/db/schema/extras.ts                # extras table + sourceEnum
src/db/schema/photos.ts                # photos table
src/db/schema/attribute-options.ts     # attribute_options table
src/db/schema/extra-attributes.ts      # extra_attributes junction
src/db/schema/availability.ts          # availability table
src/db/schema/shooting-days.ts         # shooting_days table
src/db/schema/scenes.ts                # scenes table
src/db/schema/extra-scenes.ts          # extra_scenes junction + statusEnum
src/db/schema/registration-tokens.ts   # registration_tokens table
drizzle.config.ts                      # drizzle-kit config
```

**Auth:**
```
src/lib/auth.ts                        # NextAuth config (Google provider only)
src/app/api/auth/[...nextauth]/route.ts
```

**Middleware:**
```
middleware.ts                          # Auth gate + registration token check
```

**Actions:**
```
src/actions/auth.ts                    # getCurrentUser, ensureProductionExists
```

**Global styles:**
```
src/app/globals.css                    # CSS variables, resets, RTL base, skeleton keyframe
```

**Layout:**
```
src/app/layout.tsx                     # Root layout: RTL html, fonts, toast provider
src/app/(auth)/layout.tsx              # Auth layout (centered card)
src/app/(auth)/login/page.tsx          # Login page — Google sign-in button only
src/app/(dashboard)/layout.tsx         # Authenticated layout with sidebar + header
src/app/(dashboard)/dashboard/page.tsx # Placeholder: "ברוך הבא" (Phase 8 fills this)
src/app/page.tsx                       # Redirect: session → /dashboard, else → /login
```

**Layout Components:**
```
src/components/layout/Sidebar/
  index.tsx
  Sidebar.module.css

src/components/layout/Header/
  index.tsx
  Header.module.css

src/components/layout/MobileNav/
  index.tsx
  MobileNav.module.css
```

**UI Primitives:**
```
src/components/ui/Button/
  index.tsx
  Button.module.css

src/components/ui/Toast/
  index.tsx
  Toast.module.css
```

### 1.4 Key Behaviors

- `src/db/index.ts`: initialize Neon + Drizzle; export `db`
- `src/lib/auth.ts`: Google provider; on `signIn` callback — if first sign-in, create `productions` row for user via `ensureProductionExists`
- `middleware.ts`:
  - Public routes (no auth check): `/login`, `/register/*`, `/api/auth/*`
  - All other routes: redirect to `/login` if no session
- Login page: single "התחבר עם Google" button, centered card, Hebrew copy, `--color-bg` page background
- Sidebar: links to ניצבים (`/extras`), חיפוש (`/search`), ימי צילום (`/shooting-days`), לוח בקרה (`/dashboard`). Active item has `--color-primary-subtle` bg + left accent bar
- MobileNav: bottom tab bar with 4 icons, height `60px`, visible on mobile only

### 1.5 Database Setup Commands

```bash
npx drizzle-kit generate   # generate initial migration
npx drizzle-kit migrate    # apply to DB
```

Seed `attribute_options` with the 26 pre-seeded values from `CLAUDE.md` in the migration or a separate seed script.

### 1.6 Acceptance Criteria

- [x] `npm run dev` starts without errors
- [x] Navigating to `/dashboard` redirects to `/login` when unauthenticated
- [x] Google sign-in works; session persists 30 days
- [x] After first sign-in, a `productions` row exists for the user
- [x] Sidebar renders with correct nav items; active state works
- [x] MobileNav renders on mobile viewports

---

## Phase 2 — Extras: Core CRUD

**Goal**: Director can view, add, edit, and delete extras. The extras list renders rows with identity info, contact icons, star toggle, and three-dot menu. Name search filters the list client-side.

### 2.1 Install Dependencies

```bash
npm install zod
```

### 2.2 Files to Create

**Zod schemas:**
```
src/lib/validations/extra.ts           # createExtraSchema, updateExtraSchema
```

**Server Actions:**
```
src/actions/extras.ts                  # getExtras, getExtra, createExtra, updateExtra, deleteExtra (soft)
```

**Pages:**
```
src/app/(dashboard)/extras/page.tsx       # Extras list — server component
src/app/(dashboard)/extras/new/page.tsx   # Add extra form page
src/app/(dashboard)/extras/[id]/page.tsx  # Edit extra form page
```

**Components:**
```
src/components/extras/ExtraRow/
  index.tsx
  ExtraRow.module.css

src/components/extras/ExtraForm/
  index.tsx
  ExtraForm.module.css

src/components/ui/Modal/
  index.tsx
  Modal.module.css

src/components/ui/Skeleton/
  index.tsx
  Skeleton.module.css
```

### 2.3 Extra Row — Zone Breakdown (RTL)

Right → left order:
1. **⋮ menu** (32×32px, border-radius 6px) — dropdown: עריכה / מחיקה
2. **Star toggle** — `isFavorite`; gold filled vs gray empty; scale(1.25) pop on click
3. **Gender icon** — `User` lucide 20px; `--color-male` or `--color-female`
4. **Identity zone** — name (bold, 0.9375rem) + age ("גיל: 34") + car icon (`Car` 16px, `--color-primary` if true, hidden if false)
5. **4 expand buttons** — icons only in Phase 2 (fully wired in Phase 3); inactive state only, no expand behavior yet
6. **Contact** — `Phone` icon (tel: link) + `MessageSquare` icon (wa.me/ link); 40px circular touch target
7. **Thumbnail** — 48×48px, border-radius 8px; placeholder: `UserCircle2` icon on gray bg

Row container: `background: --color-card`, `border: 1px solid --color-border`, `border-radius: 12px`

### 2.4 Extra Form — Fields in Phase 2

| Field | Input type |
|-------|-----------|
| שם מלא | text, required |
| טלפון | text |
| מגדר | radio/toggle: זכר / נקבה |
| גיל | number |
| גובה (ס"מ) | number |
| משקל (ק"ג) | number |
| יש רכב | checkbox |
| אמינות | 3-option selector: לא אמין / בסדר / אמין |
| הערות | textarea |

Physical attributes and availability added in Phase 3. Photos added in Phase 4.

### 2.5 Key Behaviors

- **Extras list** (`/extras`): Server Component fetches all active extras (`deletedAt IS NULL`) for `productionId`. Passes to client for name filtering
- **Name search**: client-side filter on `fullName` — no server round-trip
- **Pagination**: 50 per page
- **Soft delete**: Server Action sets `deletedAt = NOW()`. Show confirmation modal first: "האם למחוק את הניצב?" + "פעולה זו אינה ניתנת לביטול"
- **Star toggle**: immediate optimistic update in client; Server Action updates `isFavorite`
- **Toast**: success on create/update/delete; error on any server failure
- **Skeleton**: render 5 skeleton rows while extras load (match row dimensions exactly)
- **Empty state**: `Users` icon → "אין ניצבים להצגה" → "+ הוסף ניצב ראשון" button

### 2.6 Acceptance Criteria

- [ ] Extras list page loads and shows all extras for the production
- [ ] Name search filters list client-side without page reload
- [ ] "הוספה" button navigates to add form
- [ ] Creating an extra saves to DB, shows success toast, redirects to list
- [ ] Editing an extra pre-fills form with existing values
- [ ] Deleting shows confirmation modal; confirmed → soft delete → row disappears
- [ ] Star toggle persists to DB
- [ ] Phone and WhatsApp links open correct URLs
- [ ] Empty state renders when no extras exist
- [ ] Skeleton renders during initial load

---

## Phase 3 — Extras: Rich Data

**Goal**: Physical attributes and availability are fully manageable. All four expandable sections in the extra row are wired up and animated.

### 3.1 Install Dependencies

No new packages required. (If a date picker component is needed: `react-day-picker` is acceptable.)

### 3.2 Files to Create

**Zod schemas:**
```
src/lib/validations/extra.ts           # extend with attributeIds[], availabilityDates[]
```

**Server Actions:**
```
src/actions/extras.ts                  # extend: getExtraWithDetails (includes attributes, availability, scenes)
src/actions/attributes.ts              # getAttributeOptions, createAttributeOption
src/actions/availability.ts            # upsertAvailability, deleteAvailability
```

**Components:**
```
src/components/extras/AttributePicker/
  index.tsx
  AttributePicker.module.css

src/components/extras/AvailabilityPicker/
  index.tsx
  AvailabilityPicker.module.css

src/components/extras/ExtraExpandableSection/
  index.tsx
  ExtraExpandableSection.module.css

src/components/extras/sections/AttributesSection/
  index.tsx
  AttributesSection.module.css

src/components/extras/sections/AvailabilitySection/
  index.tsx
  AvailabilitySection.module.css

src/components/extras/sections/ScenesSection/
  index.tsx
  ScenesSection.module.css       # placeholder only — fully wired in Phase 6

src/components/extras/sections/MoreInfoSection/
  index.tsx
  MoreInfoSection.module.css

src/components/ui/Tag/
  index.tsx
  Tag.module.css
```

### 3.3 Expand/Collapse Behavior

- One open section per row at a time — clicking an open button closes it; clicking a different button closes the current and opens the new one
- State managed per-row in client component (`useState<string | null>`)
- CSS transition: `max-height: 0 → 800px` + `opacity: 0 → 1`, 300ms / 200ms ease
- Active button: `background: --color-primary-subtle`, icon+label `--color-primary`
- Expand triggers: מאפיינים (`Accessibility` icon), סצנות (`Clapperboard`), תאריכים (`Calendar`), מידע (`Info`)
- Expanded section wrapper: `background: --color-bg`; inner content card: `background: --color-card`, `border: 1px solid --color-border`, `border-radius: 8px`

### 3.4 Attribute Picker (in Extra Form)

- Shows all `attribute_options` as selectable tag pills
- Rotate through `--color-tag-1` to `--color-tag-5` by index
- Selected tags have filled background; click to deselect
- Free-text input at bottom: typing a new label and pressing Enter creates a new `attribute_options` row (if unique) and immediately selects it
- On form save: sync `extra_attributes` — delete removed, insert added

### 3.5 Availability Picker (in Extra Form)

- Month calendar grid; click a date to toggle available/unavailable
- Available = green cell; unavailable = red cell; no entry = neutral
- Saves to `availability` table (one row per date per extra)

### 3.6 Physical Attributes Section (in Row)

- Render all `attribute_options` linked to this extra as colored tag pills
- Tags rotate through `--color-tag-1` through `--color-tag-5` palettes by index
- Empty: no tags — section still opens but shows nothing (or brief "אין מאפיינים" note)

### 3.7 Availability Calendar Section (in Row)

- Full month calendar grid (7-column, RTL day headers: א ב ג ד ה ו ש)
- Available dates: `--color-success-subtle` bg, `--color-success` text, green border
- Unavailable dates: `--color-danger-subtle` bg, `--color-danger` text, red border
- Today: additional `outline: 2px solid --color-primary` ring
- Color legend row above the grid

### 3.8 More Info Section (in Row)

- Notes text paragraph (or "אין הערות" if empty)
- Reliability badge:
  - `אמין` (2): `--color-success-subtle` / `--color-success`
  - `בסדר` (1): `--color-warning-subtle` / `--color-warning`
  - `לא אמין` (0): `--color-danger-subtle` / `--color-danger`

### 3.9 Scenes Section (in Row) — Phase 3 Placeholder

- Render section UI shell but with empty state only: `Film` icon + "לא הופיע בסצנות עדיין"
- If no scenes exist yet: expand button is visually muted (reduced opacity, no hover background)
- Wired to real data in Phase 6

### 3.10 Acceptance Criteria

- [ ] Physical attribute picker shows all 26 pre-seeded options
- [ ] Selecting/deselecting attributes saves correctly on form submit
- [ ] Adding a custom attribute creates the DB row and selects it
- [ ] Availability dates toggle correctly and persist
- [ ] All 4 expand buttons animate open/close
- [ ] Only one section open at a time per row
- [ ] Availability calendar renders with correct color coding
- [ ] Reliability badge color matches value

---

## Phase 4 — Photo System ✅ DONE

**Goal**: Director can upload, view, reorder, and delete photos for each extra. Photos are stored in Cloudflare R2. The extra row shows the primary photo as a thumbnail.

### 4.1 Install Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner browser-image-compression
```

### 4.2 Files to Create

**R2 helpers:**
```
src/lib/r2.ts                          # S3 client, generatePresignedUploadUrl, generatePresignedGetUrl
```

**API Routes:**
```
src/app/api/upload/presign/route.ts    # POST: return { uploadUrl, key } for a given extraId
src/app/api/upload/delete/route.ts     # DELETE: remove R2 object by key
```

**Server Actions:**
```
src/actions/photos.ts                  # createPhoto, deletePhoto, reorderPhotos, getPhotoUrls
```

**Components:**
```
src/components/extras/PhotoUploader/
  index.tsx
  PhotoUploader.module.css
```

### 4.3 Upload Flow

1. User selects/drops image in `PhotoUploader`
2. Client compresses with `browser-image-compression`: max 400px width, quality 0.7, output WebP
3. Client `POST /api/upload/presign` with `extraId` → receives `{ uploadUrl, key }`
4. Client `PUT {uploadUrl}` with compressed image binary (direct to R2)
5. Client calls Server Action `createPhoto({ extraId, r2Key: key, sortOrder })` to save DB record
6. UI updates with new photo thumbnail (presigned GET URL, TTL 1 hour)

### 4.4 Display Flow

- `getPhotoUrls(extraIds[])` Server Action: fetches photo records → generates presigned GET URLs for each
- Client caches presigned URLs in component state (no re-fetch for session duration)
- Extra row thumbnail: `sortOrder = 0` photo, or `UserCircle2` placeholder if none

### 4.5 PhotoUploader Component

- Drag & drop zone or click to browse
- Shows preview grid of up to 5 photos
- Drag to reorder (updates `sortOrder` on all affected rows in one transaction)
- Delete button on each photo (removes DB row + R2 object)
- Max 5 photos enforced: upload button disabled when count = 5
- Progress indicator during upload
- Error toast if upload fails

### 4.6 Key Behaviors

- `presign` route: validate session + role; accept `image/*` only; presigned URL expires 15 minutes
- `delete` route: validate session + role; delete R2 object; caller is responsible for removing DB record
- Object key format: `extras/{extraId}/{timestamp}-{uuid}.webp`
- Max 5 photos enforced in Server Action (check count before insert)

### 4.7 Acceptance Criteria

- [x] Uploading a photo compresses it client-side before sending
- [x] Photo appears in the uploader preview after upload
- [x] Primary photo (`sortOrder = 0`) appears as thumbnail in extras list
- [x] Photos can be reordered by drag; new order persists after page reload
- [x] Deleting a photo removes it from R2 and DB; thumbnail updates
- [x] Attempting to upload a 6th photo is blocked with an error toast
- [x] Placeholder silhouette shown when extra has no photos

---

## Phase 5 — Shooting Days & Scenes

**Goal**: Director can manage shooting days (create, edit, archive) and scenes within each day (add, edit, reorder, delete). Gap indicators show understaffed scenes.

### 5.1 Install Dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 5.2 Files to Create

**Zod schemas:**
```
src/lib/validations/shooting-day.ts    # createShootingDaySchema, updateShootingDaySchema
src/lib/validations/scene.ts           # createSceneSchema, updateSceneSchema
```

**Server Actions:**
```
src/actions/shooting-days.ts           # getShootingDays, getShootingDay, createShootingDay, updateShootingDay, archiveShootingDay
src/actions/scenes.ts                  # getScenes, createScene, updateScene, deleteScene, reorderScenes
```

**Pages:**
```
src/app/(dashboard)/shooting-days/page.tsx          # Shooting days list
src/app/(dashboard)/shooting-days/[id]/page.tsx     # Shooting day detail
src/app/(dashboard)/shooting-days/archive/page.tsx  # Archive view
```

**Components:**
```
src/components/shooting-days/ShootingDayCard/
  index.tsx
  ShootingDayCard.module.css

src/components/shooting-days/ShootingDayForm/
  index.tsx
  ShootingDayForm.module.css

src/components/shooting-days/SceneBlock/
  index.tsx
  SceneBlock.module.css

src/components/shooting-days/SceneForm/
  index.tsx
  SceneForm.module.css
```

### 5.3 Shooting Days List

- Cards for all non-archived shooting days, sorted by date ascending
- Card content: date (Hebrew locale, e.g. "יום שלישי, 18 בפברואר 2026"), title, scene count, total assigned extras, gap count
- Gap chip: "חסרים N ניצבים" in `--color-danger-subtle` / `--color-danger` if any scene has a gap
- "יום צילום חדש" primary button
- Link to archive at bottom of page
- Empty state: `CalendarX` icon + "אין ימי צילום קרובים"

### 5.4 Shooting Day Detail

**Header:**
- Date display + prev/next day navigation buttons
- "קפוץ לתאריך" date picker input
- Editable title and notes (inline or via edit button)
- "הוסף סצנה" primary button
- "ייצוא לווצאפ" button (placeholder in Phase 5; wired in Phase 6)
- "ארכיון" button (archives the day; confirms first)

**Scene list:**
- Scenes sorted by `sortOrder`; drag handle (`GripVertical` icon) for reordering
- Dropping updates all affected `sortOrder` values in a single Server Action call

### 5.5 Scene Card

- Scene number badge (indigo-100 bg, sequential)
- Title + description
- Gap indicator: "חסרים N / M ניצבים" (warning color if gap, success if fully cast)
- Assigned extras count display
- Action buttons: copy (placeholder in Phase 5), edit, delete
- Extras grid (Phase 6 fills this with real data; Phase 5 shows placeholder "הוסף ניצבים לסצנה")
- "מצא ניצבים" and "שיבוץ מהיר" buttons (placeholder in Phase 5)

### 5.6 Gap Calculation

Computed query: `scenes.required_extras - COUNT(extra_scenes WHERE status IN ('confirmed', 'arrived'))`

Since `extra_scenes` doesn't exist yet in Phase 5: show `0 / required_extras` for assigned count. Phase 6 fills this.

### 5.7 Archive

- Archive button on shooting day detail sets `isArchived = true`
- Archived days redirect to the archive list after archiving
- Archive page: same card layout, date range filter, read-only (no edit/add buttons)
- Archived day detail: same layout, all controls hidden/disabled

### 5.8 Acceptance Criteria

- [ ] Shooting days list shows cards sorted by date
- [ ] Creating a shooting day saves and appears in the list
- [ ] Editing a shooting day updates correctly
- [ ] Shooting day detail renders with scenes (empty state if none)
- [ ] Adding a scene saves and appears in the list
- [ ] Editing a scene updates correctly
- [ ] Deleting a scene shows confirmation, then removes it
- [ ] Drag-and-drop reordering persists new `sortOrder` values
- [ ] Archiving moves the day to the archive list and makes it read-only
- [ ] Gap chip shows correct count on the shooting days list card

---

## Phase 6 — Scene Assignment & Status Flow

**Goal**: Director can assign extras to scenes, advance their status through the candidate flow, and export the day's summary to WhatsApp. The "Scenes" expandable section in the extra row is fully wired.

### 6.1 Files to Create

**Server Actions:**
```
src/actions/extra-scenes.ts            # assignExtra, updateExtraStatus, removeExtraFromScene, getExtraScenes
src/actions/scenes.ts                  # extend: duplicateScene
```

**Components:**
```
src/components/shooting-days/ExtraSlot/
  index.tsx
  ExtraSlot.module.css

src/components/ui/StatusBadge/
  index.tsx
  StatusBadge.module.css
```

### 6.2 Assigning an Extra to a Scene

- "מצא ניצבים" button on scene card → navigate to `/search?sceneId={id}` (Phase 7 handles this)
- "שיבוץ מהיר" button on scene card → open an inline search input within the scene card to quickly find and assign an extra by name
- On assign: `insertExtraScene({ extraId, sceneId, status: 'proposed' })`
- If extra already assigned to this scene: show error toast "הניצב כבר משובץ לסצנה זו"

### 6.3 Candidate Status Flow

Each extra assigned to a scene has a status badge that is also a dropdown:

```
הוצע → נשלחה הודעה → אישר → הגיע
```

- Click badge → dropdown with the 4 status options
- Current status highlighted; selecting a new one calls `updateExtraStatus`
- Status badge colors per `UI_UX.md`:
  - `הוצע`: `--color-warning-subtle` / `--color-warning`
  - `נשלחה הודעה`: `--color-info-subtle` / `--color-info`
  - `אישר`: `--color-success-subtle` / `--color-success`
  - `הגיע`: `--color-text` bg / white text

### 6.4 Scene Card — Assigned Extras Grid

- Shows each assigned extra: 40×40px photo thumbnail, name, status badge
- Clicking the extra's name navigates to `/extras/[id]`
- Remove button (×) removes extra from scene (with confirmation)
- Gap counter updates live: `confirmed + arrived` count toward filling `requiredExtras`

### 6.5 Scenes Section in Extra Row — Wired

Replace Phase 3's placeholder with real data:
- Fetch `extra_scenes` joined with `scenes` and `shooting_days` for the extra
- Per assignment card: scene number badge, scene title, role (`situation`), outfit (`look` in a white pill)
- Show shooting day date below scene title
- Empty state if no assignments: `Film` icon + "לא הופיע בסצנות עדיין" — expand button is muted (reduced opacity)
- Non-empty: expand button is fully active

### 6.6 WhatsApp Export

- "ייצוא לווצאפ" button on shooting day detail
- Server Action `generateWhatsAppSummary(shootingDayId)` returns formatted string:

```
📅 יום צילום: יום שני, 16 במרץ 2026
🎬 סצנה 1: סצנת בית הקפה
   ניצבים: יונתן כהן, מיכל לוי, דוד ישראלי
🎬 סצנה 2: סצנת הרחוב
   ניצבים: שרה אברהם
   ⚠️ חסרים: 2 ניצבים
```

- Copy to clipboard via `navigator.clipboard.writeText()`
- Success toast: "!הועתק ללוח"

### 6.7 Duplicate Scene

- Copy icon button on scene card
- Copies `title`, `description`, `requiredExtras`, `sortOrder` to the same shooting day (appended at end)
- Does NOT copy `extra_scenes` assignments
- Success toast: "הסצנה שוכפלה"

### 6.8 Acceptance Criteria

- [ ] Extras can be assigned to scenes from the shooting day detail
- [ ] Assigning a duplicate shows an error toast
- [ ] Status badge renders correct color per status
- [ ] Clicking status badge shows dropdown; selecting a new status updates DB and UI
- [ ] `confirmed + arrived` count updates the gap indicator
- [ ] Removing an extra from a scene requires confirmation
- [ ] "Scenes" section in extra row shows all scene assignments with look/situation
- [ ] Empty state for scenes section renders correctly with muted button
- [ ] WhatsApp export copies correct formatted text to clipboard
- [ ] Duplicate scene creates a copy without assignments

---

## Phase 7 — Search

**Goal**: Director can search the extras roster using any combination of filters and assign results directly to a scene.

### 7.1 Files to Create

**Zod schemas:**
```
src/lib/validations/search.ts          # searchFiltersSchema
```

**Server Actions:**
```
src/actions/search.ts                  # searchExtras(filters, productionId)
```

**Pages:**
```
src/app/(dashboard)/search/page.tsx    # Search page
```

**Components:**
```
src/components/search/SearchForm/
  index.tsx
  SearchForm.module.css

src/components/search/SearchResults/
  index.tsx
  SearchResults.module.css

src/components/search/ScenePicker/
  index.tsx
  ScenePicker.module.css
```

### 7.2 Search Filters

| Filter | Behavior |
|--------|---------|
| שם / הערות | `ILIKE %query%` on `fullName` OR `notes` |
| מאפיינים פיזיים | Multi-select pills; extra must have ALL selected attributes (AND logic) |
| טווח גילאים | `age >= min AND age <= max` |
| מגדר | Exact match (0=נקבה, 1=זכר); "הכל" = no filter |
| פנוי בתאריך | Extra has an `availability` row with that date + `isAvailable = true` |
| יש רכב | `hasCar = true` |

- Filters combine with AND logic
- Results update on form submit (not live)
- Results count shown: "נמצאו N ניצבים"

### 7.3 Search Server Action

`searchExtras` must join:
- `extras` (base)
- `extra_attributes` → `attribute_options` (for attribute filter)
- `availability` (for date filter)

Return extras with their primary photo R2 key (for thumbnail URL generation), attribute tags, and `isFavorite`.

### 7.4 Results Grid

- Compact extra cards: 4 columns desktop / 2 tablet / 1 mobile
- Card: thumbnail (aspect-ratio square), name + age, gender icon, car icon, top 3 attribute tags, "הוסף לסצנה" button
- Status badge: "מועדף" (indigo) if `isFavorite = true`
- Hover: subtle lift (no box-shadow — use border transition instead)

### 7.5 Scene Assignment from Search

When navigated with `?sceneId=N` in the URL:
1. A sticky header banner shows: "משבץ ניצב לסצנה: {sceneTitle}" with a cancel (×) button
2. "הוסף לסצנה" button on each result → opens `ScenePicker` showing the specific scene's details and an "שבץ" confirm button
3. On confirm: calls `assignExtra({ extraId, sceneId })`, shows success toast, returns to shooting day detail

When navigated without `?sceneId`:
- "הוסף לסצנה" button → opens `ScenePicker` modal listing all scenes across all non-archived shooting days
- Scenes grouped by shooting day date
- Each scene row: scene number, title, date, gap status badge ("חסרים N" or "מלא")
- Fully cast scenes: grayed out, "שבץ" button disabled with `cursor-not-allowed`

### 7.6 Acceptance Criteria

- [ ] Search page renders filter controls with correct Hebrew labels
- [ ] Attribute pills are multi-selectable and visually distinct when active
- [ ] Submitting filters returns correct results from DB
- [ ] Empty results state: `Search` icon + "לא נמצאו ניצבים התואמים לחיפוש"
- [ ] Navigating from a scene's "מצא ניצבים" button pre-selects the scene context
- [ ] Assigning an extra from search redirects back to the shooting day detail
- [ ] Scene picker shows gap status; fully cast scenes are disabled
- [ ] Results show primary photo thumbnail

---

## Phase 8 — Dashboard

**Goal**: The dashboard gives the director an immediate view of today's and tomorrow's shooting days — confirmed extras per scene, status indicators, and gaps.

### 8.1 Files to Create

**Server Actions:**
```
src/actions/shooting-days.ts           # extend: getTodayAndTomorrowDays(productionId)
```

**Pages:**
```
src/app/(dashboard)/dashboard/page.tsx # Replace placeholder (Server Component + streaming)
```

**Components:**
```
src/components/dashboard/TodayOverview/
  index.tsx
  TodayOverview.module.css

src/components/dashboard/TomorrowGaps/
  index.tsx
  TomorrowGaps.module.css

src/components/dashboard/DaySection/
  index.tsx
  DaySection.module.css
```

### 8.2 Today Section (היום)

- Header: "היום — {date in Hebrew}"
- If shooting day exists: show each scene as a block with:
  - Scene name + required count
  - List of assigned extras with quick status icons: ✓ (הגיע, success), ⏳ (אישר, warning), ❓ (הוצע/contacted, muted)
  - Count: "N/M ניצבים"
- If no shooting day today: `CalendarX` icon + "אין יום צילום היום"

### 8.3 Tomorrow Section (מחר)

- Header: "מחר — {date in Hebrew}"
- If shooting day exists:
  - Show each scene with gap alert if `assignedConfirmed < requiredExtras`
  - Gap: "⚠️ חסרים N ניצבים לסצנה {title}" in `--color-danger`
  - Fully staffed scenes: green checkmark + scene name
  - "מצא ניצבים" link per gap (→ `/search?sceneId={id}`)
- If no shooting day tomorrow: `CalendarX` icon + "אין יום צילום מחר"

### 8.4 Acceptance Criteria

- [ ] Dashboard shows today's shooting day with extras and statuses
- [ ] Dashboard shows tomorrow's shooting day with gap warnings
- [ ] Empty states render for days with no shooting day
- [ ] Dashboard is the default redirect after login (replaces placeholder)
- [ ] Streaming: today section renders first, tomorrow streams in

---

## Phase 9 — Public Registration

**Goal**: Director can generate shareable registration links. Extras can self-register via the link without authentication. Submissions are rate-limited.

### 9.1 Install Dependencies

```bash
npm install @upstash/ratelimit @upstash/redis
```

Add to `.env.local`:
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### 9.2 Files to Create

**Rate limiter:**
```
src/lib/rate-limit.ts                  # Upstash sliding window: 10/IP/hour
```

**Zod schemas:**
```
src/lib/validations/registration.ts    # publicRegistrationSchema
```

**Server Actions:**
```
src/actions/registration.ts            # submitRegistration (Server Action, calls rate limiter)
src/actions/tokens.ts                  # createToken, deactivateToken, getTokens
```

**Pages:**
```
src/app/register/[token]/page.tsx      # Public registration page (no auth)
```

**Components:**
```
src/components/registration/RegistrationForm/
  index.tsx
  RegistrationForm.module.css
```

### 9.3 Token Validation

Token validation happens in `middleware.ts` (already set up in Phase 1):
- Look up `token` in `registration_tokens`
- If not found or `isActive = false`: render error page (not redirect) — show Hebrew message: "הקישור אינו תקף"

### 9.4 Registration Form Fields

Name, phone, gender, age, height, weight, hasCar, availability dates (date picker, multiple), notes, up to 3 photos.

- Physical attributes NOT on public form
- Photos: same presigned upload flow as Phase 4 (no auth needed for presign route in this context — validate via token header)
- On submit: rate check first, then `createExtra({ ...fields, source: 'public_form' })`
- Success: replace form with "!תודה, הפרטים נקלטו" + confetti or simple success illustration
- Rate limit exceeded: show "נסה שוב מאוחר יותר" (HTTP 429)

### 9.5 Rate Limiter Integration

```typescript
// In submitRegistration Server Action:
const ip = headers().get('x-forwarded-for') ?? 'unknown'
const { success } = await registrationRateLimit.limit(ip)
if (!success) return { error: 'rate_limited' }
```

### 9.6 Token Management (in Settings — Phase 10 completes the UI)

Server Actions in `src/actions/tokens.ts`:
- `createToken()`: generate 64-char URL-safe random token, insert into `registration_tokens`
- `deactivateToken(id)`: set `isActive = false`
- `getTokens()`: return all tokens for the production

### 9.7 Acceptance Criteria

- [ ] Navigating to `/register/[invalid-token]` shows the invalid token error page
- [ ] Valid token renders the registration form
- [ ] Submitting the form creates an extra with `source: 'public_form'`
- [ ] Submitting >10 times from the same IP within an hour is blocked
- [ ] Success state replaces the form with the thank-you message
- [ ] New extras from public form appear in the extras list in the dashboard

---

## Phase 10 — Settings & Final Polish

**Goal**: Complete the settings page (user management, token management, attribute options). Audit all pages for missing skeletons, empty states, accessibility, and mobile responsiveness.

### 10.1 Files to Create

**Pages:**
```
src/app/(dashboard)/settings/page.tsx   # Settings — tabbed or sectioned
```

**Components:**
```
src/components/settings/UserManagement/
  index.tsx
  UserManagement.module.css

src/components/settings/TokenManagement/
  index.tsx
  TokenManagement.module.css

src/components/settings/AttributeOptions/
  index.tsx
  AttributeOptions.module.css
```

**Server Actions:**
```
src/actions/auth.ts                    # extend: getUsers, updateUserRole (admin only)
```

### 10.2 Settings Page Sections

**ניהול משתמשים** (admin only):
- Table of all users: name, email, role badge, role change dropdown
- Role change calls `updateUserRole(userId, newRole)`
- Admin cannot change their own role (disabled)

**לינקי הרשמה**:
- List of all tokens with status (פעיל / מושהה), created date, and the full URL
- "צור לינק חדש" button → generates and shows new token URL
- "השהה" button per active token
- Copy-to-clipboard button per token URL

**מאפיינים פיזיים**:
- List of all `attribute_options`
- Add new attribute (text input + save button)
- No delete in MVP (attributes are shared; removing could affect existing extras)

### 10.3 Polish Checklist

**Skeleton loading states** — audit every page and add skeletons where missing:
- [ ] Shooting days list
- [ ] Shooting day detail
- [ ] Search results
- [ ] Dashboard sections

**Empty states** — audit every list/section:
- [ ] Shooting days list: `CalendarX` + "אין ימי צילום קרובים"
- [ ] Archive list: `Archive` + "אין ימי צילום בארכיון"
- [ ] Search results: `Search` + "לא נמצאו ניצבים התואמים לחיפוש"
- [ ] Scene's assigned extras: `Users` + "לא שובצו ניצבים לסצנה זו"

**Accessibility audit**:
- [ ] All icon-only buttons have `aria-label` in Hebrew
- [ ] All expand triggers have `aria-expanded`
- [ ] Modals have `role="dialog"`, `aria-modal="true"`, and trap focus
- [ ] All form inputs have associated `<label>` elements
- [ ] Focus ring visible on all interactive elements (2px solid `--color-primary`)
- [ ] Color is never the sole indicator (check status badges, gap indicators)

**Mobile responsiveness audit**:
- [ ] Extra row collapses to 2-row stacked layout on mobile
- [ ] Search filters collapse to single column
- [ ] Scene cards readable and operable at 375px width
- [ ] Dashboard sections full-width on mobile
- [ ] Bottom nav renders correctly; sidebar hidden on mobile
- [ ] All touch targets minimum 44×44px

**Final checks**:
- [ ] All Hebrew copy reviewed for consistency
- [ ] Date formatting uses `date-fns` with Hebrew locale throughout
- [ ] No `console.error` or unhandled promise rejections in dev tools
- [ ] `next build` completes without TypeScript errors

### 10.4 Acceptance Criteria

- [ ] Admin can change any user's role via the settings page
- [ ] Admin cannot change their own role
- [ ] Director can generate, copy, and deactivate registration tokens
- [ ] Custom attribute options can be added from settings
- [ ] All pages have correct skeleton and empty states
- [ ] All accessibility requirements pass
- [ ] App is fully usable on a 375px mobile viewport
- [ ] `next build` succeeds with no errors

---

## Appendix A — File Creation Order (Critical Path)

For Phase 1, create files in this order to avoid circular imports:

1. `src/db/schema/users.ts`
2. `src/db/schema/productions.ts`
3. `src/db/schema/attribute-options.ts`
4. `src/db/schema/extras.ts`
5. `src/db/schema/extra-attributes.ts`
6. `src/db/schema/photos.ts`
7. `src/db/schema/availability.ts`
8. `src/db/schema/shooting-days.ts`
9. `src/db/schema/scenes.ts`
10. `src/db/schema/extra-scenes.ts`
11. `src/db/schema/registration-tokens.ts`
12. `src/db/index.ts` (imports all schema files)
13. `src/lib/auth.ts` (imports db)

---

## Appendix B — CSS Module Naming Conventions

Always use camelCase for class names in CSS Modules:

```css
/* Good */
.extraRow { }
.expandSection { }
.statusBadge { }

/* Bad */
.extra-row { }
.expand_section { }
```

Import in components:
```typescript
import styles from './ComponentName.module.css'
// Usage: className={styles.extraRow}
// Conditional: className={`${styles.extraRow} ${isOpen ? styles.open : ''}`}
```

---

## Appendix C — Server Action Return Convention

All Server Actions return a typed result object — never throw:

```typescript
// Success
return { data: result }

// Error
return { error: 'מסר שגיאה בעברית' }

// Client handling
const result = await someAction(input)
if ('error' in result) {
  toast.error(result.error)
  return
}
// use result.data
```
