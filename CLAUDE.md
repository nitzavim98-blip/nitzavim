# ExtraCast — CLAUDE.md

## Project Overview

ExtraCast is a web app for **third assistant directors** (במאי שלישי) managing extras (ניצבים) in Israeli film/TV productions. Single-tenant deployment — one director per instance. Each user owns one **production** (הפקה), which is the top-level container for all data. The app manages the full lifecycle: registering extras, searching candidates, assigning them to scenes, managing shooting days, and archiving.

**Language**: Hebrew only, full RTL layout throughout.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | **CSS Modules only** — NO Tailwind, NO CSS-in-JS |
| Auth | NextAuth.js (Google provider only) |
| Database | Neon Postgres + Drizzle ORM |
| Rate Limiting | Upstash Redis (used ONLY for rate limiting) |
| Image Storage | Cloudflare R2 (S3-compatible API) |
| Image Compression | Client-side via `browser-image-compression` before upload |
| Validation | Zod (all inputs — client & server) |
| Notifications | Toast system (react-hot-toast or custom) |
| Hosting | Vercel |

---

## Architecture Principles

### Data Fetching

- **Primary**: Server Actions (use `"use server"` actions for all mutations and most data fetching)
- **Secondary**: API routes only when Server Actions are insufficient (e.g., presigned URL generation for R2, webhook endpoints)
- Never use API routes for simple CRUD — use Server Actions

### Authentication

- NextAuth.js with Google provider only
- Session strategy: `jwt` with `maxAge: 30 days` by default (no remember me checkbox — always long session)
- All authenticated pages wrapped in middleware checking session
- **Roles**: `admin`, `director`, `guest` — new users default to `director`
    - `admin`: Full access + can manage users (add/remove, change roles)
    - `director`: Full access to all extras, shooting days, scenes, search, settings
    - `guest`: Read-only access to all data (cannot create, edit, or delete)
- Roles are assigned manually (admin changes another user's role via settings)

### Database (Drizzle + Neon)

- All schemas defined in `src/db/schema/`
- Use Drizzle's query builder — no raw SQL
- Migrations managed via `drizzle-kit`
- Connection via Neon serverless driver (`@neondatabase/serverless`)

### Image Handling (Cloudflare R2)

- Client compresses images before upload using `browser-image-compression` (target: max 400px width, 70% quality, WebP format)
- Client requests a presigned upload URL from an API route
- Client uploads directly to R2 using the presigned URL
- DB stores the R2 object key (not full URL)
- Server generates presigned GET URLs on demand for display (short TTL: 1 hour)
- Max 5 photos per extra

### Rate Limiting (Upstash)

- Used **only** on the public registration form endpoint
- Rate limit: 10 submissions per IP per hour
- Use `@upstash/ratelimit` with sliding window

### Validation

- Zod schemas defined in `src/lib/validations/`
- Same schema used client-side (form validation) and server-side (action validation)
- Always validate in Server Actions even if client already validated

### Loading & Empty States

- **Loading**: Show skeleton components (shimmer/pulse animation) for all data-loading states
- **Empty**: Show a centered message with an icon and descriptive Hebrew text (e.g., "אין ניצבים להצגה")
- Never show a blank screen

### Toast Notifications

- Success toast: add, edit, delete operations
- Error toast: validation failures, server errors
- Use consistent positioning (top-center)

---

## Design System

### Direction

- `dir="rtl"` on `<html>` element
- All layouts flow right-to-left
- CSS logical properties preferred (`margin-inline-start` over `margin-right`)

### Typography

- **Font family**: `"Heebo"` as primary (imported from Google Fonts) — clean, modern, excellent Hebrew support
- **Fallback stack**: `"Rubik", "Assistant", sans-serif`
- **Weights used**: 400 (body), 500 (labels/secondary), 700 (headings/names)
- **Scale**:
  - Page headings: `1.5rem / font-weight: 700`
  - Section labels / card titles: `0.875rem / font-weight: 700 / letter-spacing: 0.05em / uppercase`
  - Body / row text: `0.875rem / font-weight: 400`
  - Secondary / metadata: `0.75rem / font-weight: 400 / color: --color-text-secondary`
  - Micro-labels (icon button labels): `0.625rem / font-weight: 700 / uppercase / letter-spacing: 0.08em`

### Color Palette

```css
:root {
  /* Backgrounds */
  --color-bg: #EEF0F6;           /* page background — cool light blue-gray */
  --color-card: #FCFDFF;         /* card / row background — near white */
  --color-card-hover: #F7F8FC;   /* subtle hover state for rows */
  --color-border: #E4E7F0;       /* dividers, card borders */
  --color-border-input: #D1D5E8; /* form input borders */

  /* Primary — indigo-slate */
  --color-primary: #5B6BAB;          /* primary actions, active nav, active icon */
  --color-primary-light: #7B8DC4;    /* hover on primary */
  --color-primary-subtle: #EEF0FB;   /* active button background, selected state bg */
  --color-primary-text: #3A4A8C;     /* primary text links, active section labels */

  /* Text */
  --color-text: #1E2540;             /* primary text — deep navy */
  --color-text-secondary: #6B7280;   /* secondary / metadata */
  --color-text-muted: #9CA3AF;       /* placeholder, disabled, empty state */

  /* Gender indicators */
  --color-male: #5B9BD5;             /* blue — male icon */
  --color-female: #D472A0;           /* rose — female icon */

  /* Semantic */
  --color-success: #4CAF7D;          /* confirmed/arrived status, available dates */
  --color-success-subtle: #EAFAF1;
  --color-warning: #F0A500;          /* proposed/pending */
  --color-warning-subtle: #FFF8E6;
  --color-danger: #E05555;           /* delete, missing extras alert */
  --color-danger-subtle: #FEF2F2;
  --color-info: #4A90C4;             /* contacted status */
  --color-info-subtle: #EDF5FC;

  /* Special */
  --color-star: #F5A623;             /* favorite star — warm amber */
  --color-star-empty: #D1D5DB;       /* unfilled star */
  --color-whatsapp: #25D366;         /* WhatsApp icon */

  /* Physical attribute tag palette */
  --color-tag-1-bg: #F3EDE8; --color-tag-1-text: #7C5C44;   /* warm beige */
  --color-tag-2-bg: #E8EEF9; --color-tag-2-text: #3A5A9C;   /* soft blue */
  --color-tag-3-bg: #E6F4EE; --color-tag-3-text: #2E7D5A;   /* soft green */
  --color-tag-4-bg: #F9E8EE; --color-tag-4-text: #9C3A5A;   /* soft rose */
  --color-tag-5-bg: #EEE8F9; --color-tag-5-text: #5A3A9C;   /* soft lavender */
}
```

### Spacing Scale

Use an 4px base unit system throughout:

```
4px   → --space-1  (xs — icon gap, tight inline)
8px   → --space-2  (sm — between label and icon)
12px  → --space-3  (md — internal card padding unit)
16px  → --space-4  (base — standard gap)
24px  → --space-6  (lg — section spacing)
32px  → --space-8  (xl — page section gap)
48px  → --space-12 (2xl — large section breaks)
```

### Elevation & Depth

- **No box-shadow** on cards or rows — depth is created by border + background contrast only
- Expandable sections use `background: var(--color-bg)` inset to distinguish from card white
- Active/open rows get a subtle `border-inline-start: 3px solid var(--color-primary)` highlight
- Modals: single `box-shadow: 0 8px 32px rgba(30, 37, 64, 0.12)` — the only permitted shadow usage

### Border Radius

```
4px   → inputs, small tags, date cells
8px   → icon buttons, small internal cards
12px  → main cards / extra rows
16px  → modals, photo upload area
```

### Component Patterns

#### Extra Row (main list item)

- White card (`border-radius: 12px`, `border: 1px solid var(--color-border)`)
- RTL grid layout: right → left: menu (⋮), star, gender icon, name+age, action buttons, phone/WA, thumbnail
- **Expandable sections**: Only one open at a time per row. Expand pushes rows below (no overlay). Smooth `max-height` + `opacity` CSS transition (300ms ease-out)
- Active expand button: background `var(--color-primary-subtle)`, icon color `var(--color-primary)`
- Expanded section background: `var(--color-bg)` with inner white card for content

#### Icon Action Buttons (expand triggers)

- Stack: icon on top, micro-label below (`0.625rem`)
- Inactive: icon `var(--color-text-secondary)`, hover `var(--color-primary)`
- Active: background `var(--color-primary-subtle)`, icon + label `var(--color-primary)`, `border-radius: 8px`
- Size: `40px × 44px` touch target

#### Tags (physical attributes)

- Rounded pills: `border-radius: 100px`, `padding: 4px 10px`
- Rotate through `--color-tag-1` through `--color-tag-5` palettes
- Font: `0.75rem / font-weight: 500`

#### Status Badges (candidate flow)

- Pill shape, semantic colors:
  - `הוצע` → `--color-warning-subtle` / `--color-warning`
  - `נשלחה הודעה` → `--color-info-subtle` / `--color-info`
  - `אישר` → `--color-success-subtle` / `--color-success`
  - `הגיע` → dark `#1E2540` bg / white text

#### Skeleton Loading

- Pulsing gray rectangles (`background: var(--color-border)`) matching layout shape
- `animation: skeleton-pulse 1.4s ease-in-out infinite`
- Match exact dimensions of the content they replace

#### Modals

- Centered overlay, `max-width: 480px`
- `border-radius: 16px`, single permitted shadow
- Hebrew confirm text + danger-colored confirm button for destructive actions

### Layout

- **Sidebar** (desktop): `240px` wide, `background: var(--color-card)`, `border-inline-end: 1px solid var(--color-border)`
- **Mobile nav**: Bottom tab bar, 4 icons, `height: 60px`
- **Content area**: `max-width: 900px` centered within the main area
- **Page padding**: `24px` desktop, `16px` mobile
- Row spacing: `gap: 8px` between extra rows

### Interactions & Motion

- Row expand: `transition: max-height 300ms ease-out, opacity 200ms ease-in`
- Star toggle: `transition: color 150ms ease, transform 150ms ease` — brief `scale(1.2)` pop on activate
- Button hover: `transition: background-color 150ms ease, color 150ms ease`
- Toast entry: slide in from top, `transform: translateY(-8px)` → `translateY(0)`, 200ms
- No scroll-triggered animations — keep UI fast and functional

### Responsive Breakpoints

```
mobile:  < 768px  — single column, bottom nav, compact rows
tablet:  768–1024px — sidebar collapsed to icon strip
desktop: > 1024px — full sidebar + content
```

### Style Guidelines

- **Bright mode only** — no dark mode
- Clean and minimal UI — information density balanced with breathing room
- Prefer icons over text wherever possible (use `lucide-react`)
- Consistent icon size: `20px` for action icons, `16px` for inline/label icons
- All interactive elements have visible hover + focus states (keyboard accessible)
- Focus ring: `outline: 2px solid var(--color-primary)`, `outline-offset: 2px`

---

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout: fonts, RTL, toast provider
│   ├── page.tsx                      # Redirect to /dashboard or /login
│   ├── globals.css                   # CSS variables, resets, global styles (only non-module CSS file)
│   ├── (auth)/
│   │   ├── login/page.tsx            # Login page
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Authenticated layout with sidebar/nav
│   │   ├── dashboard/page.tsx        # Main screen — today/tomorrow overview
│   │   ├── extras/
│   │   │   ├── page.tsx              # Extras list (main table)
│   │   │   ├── [id]/page.tsx         # Single extra detail/edit page
│   │   │   └── new/page.tsx          # Add new extra form
│   │   ├── search/page.tsx           # Search extras
│   │   ├── shooting-days/
│   │   │   ├── page.tsx              # Shooting days list + management
│   │   │   ├── [id]/page.tsx         # Single shooting day detail
│   │   │   └── archive/page.tsx      # Archived shooting days
│   │   └── settings/page.tsx         # Optional: manage physical attribute options, etc.
│   ├── register/[token]/page.tsx     # Public registration form (no auth required)
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── upload/presign/route.ts   # Generate R2 presigned upload URL
│       └── upload/delete/route.ts    # Delete image from R2
├── actions/
│   ├── productions.ts                # CRUD for production
│   ├── extras.ts                     # CRUD for extras
│   ├── scenes.ts                     # CRUD for scenes
│   ├── shooting-days.ts              # CRUD for shooting days
│   ├── search.ts                     # Search/filter extras
│   └── auth.ts                       # Auth-related actions
├── components/
│   ├── ui/                           # Reusable UI components, each in its own folder:
│   │   ├── Button/
│   │   │   ├── index.tsx
│   │   │   └── Button.module.css
│   │   ├── Input/
│   │   │   ├── index.tsx
│   │   │   └── Input.module.css
│   │   ├── Tag/
│   │   ├── Skeleton/
│   │   ├── Toast/
│   │   ├── Modal/
│   │   └── ... (same pattern for all UI components)
│   ├── extras/                       # ExtraRow/, ExtraExpandableSection/, ExtraForm/, PhotoUploader/
│   ├── shooting-days/                # ShootingDayCard/, SceneBlock/, ExtraSlot/
│   ├── search/                       # SearchForm/, SearchResults/
│   ├── dashboard/                    # TodayOverview/, TomorrowGaps/
│   └── layout/                       # Sidebar/, Header/, MobileNav/
├── db/
│   ├── index.ts                      # Drizzle client + Neon connection
│   ├── schema/
│   │   ├── productions.ts
│   │   ├── extras.ts
│   │   ├── photos.ts
│   │   ├── scenes.ts
│   │   ├── shooting-days.ts
│   │   ├── extra-scenes.ts           # Junction: extras ↔ scenes
│   │   ├── attribute-options.ts      # Canonical attribute list (many-to-many source)
│   │   ├── extra-attributes.ts       # Junction: extras ↔ attribute_options
│   │   ├── availability.ts
│   │   └── users.ts                  # User accounts with roles (admin/director/guest)
│   └── migrations/
├── lib/
│   ├── validations/                  # Zod schemas
│   │   ├── extra.ts
│   │   ├── scene.ts
│   │   ├── shooting-day.ts
│   │   └── auth.ts
│   ├── r2.ts                         # R2 client + presigned URL helpers
│   ├── rate-limit.ts                 # Upstash rate limiter setup
│   ├── auth.ts                       # NextAuth config
│   └── utils.ts                      # Date formatting, Hebrew helpers, etc.
└── types/
    └── index.ts                      # Shared TypeScript types/interfaces
```

---

## Database Schema (Drizzle)

### productions

The top-level container. Each user (director) owns exactly one production.

| Column | Type | Notes |
| --- | --- | --- |
| id | serial, PK |  |
| userId | integer, FK | → users.id. One production per user |
| name | varchar(255) | Production name, e.g. "סדרה עונה 2" |
| title | varchar(255) | Working title or display title, nullable |
| createdAt | timestamp | Default now |
| updatedAt | timestamp | Auto-update |

### extras

| Column | Type | Notes |
| --- | --- | --- |
| id | serial, PK |  |
| productionId | integer, FK | → productions.id |
| fullName | varchar(255) | Required |
| phone | varchar(20) | Nullable |
| email | varchar(255) | Nullable, optional |
| age | integer | Nullable |
| gender | integer | 1 = male, 0 = female. Default 1 |
| height | integer | cm, nullable, optional |
| weight | integer | kg, nullable, optional |
| hasCar | boolean | Default false |
| reliability | integer | 0 = לא אמין, 1 = בסדר, 2 = אמין. Default 2 |
| notes | text | Free text |
| isFavorite | boolean | Default false (star toggle) |
| source | enum('manual','public_form') | How they were added |
| deletedAt | timestamp | Soft delete — NULL means active |
| createdAt | timestamp | Default now |
| updatedAt | timestamp | Auto-update |

### photos

| Column | Type | Notes |
| --- | --- | --- |
| id | serial, PK |  |
| extraId | integer, FK | → extras.id |
| r2Key | varchar(500) | R2 object key |
| sortOrder | integer | Display order (0-4) |
| createdAt | timestamp |  |

### attribute_options

The canonical list of physical attributes. Shared across all extras (many-to-many via `extra_attributes`).

| Column | Type | Notes |
| --- | --- | --- |
| id | serial, PK |  |
| label | varchar(100) | e.g., "מראה אירופאי". Unique |

### extra_attributes (junction)

Links extras to attribute_options. Replaces the old `physical_attributes` denormalized table.

| Column | Type | Notes |
| --- | --- | --- |
| extraId | integer, FK | → extras.id |
| attributeId | integer, FK | → attribute_options.id |
| PRIMARY KEY | (extraId, attributeId) | Composite — no duplicate assignments |

### availability

| Column | Type | Notes |
| --- | --- | --- |
| id | serial, PK |  |
| extraId | integer, FK | → extras.id |
| date | date |  |
| isAvailable | boolean | true = available |
| note | varchar(255) | Optional |

### shooting_days

| Column | Type | Notes |
| --- | --- | --- |
| id | serial, PK |  |
| productionId | integer, FK | → productions.id |
| date | date | Shooting date |
| title | varchar(255) | Optional title |
| location | varchar(255) | Shooting location, optional |
| notes | text | Free text for the director |
| isArchived | boolean | Default false |
| createdAt | timestamp |  |
| updatedAt | timestamp |  |

### scenes

| Column | Type | Notes |
| --- | --- | --- |
| id | serial, PK |  |
| shootingDayId | integer, FK | → shooting_days.id |
| title | varchar(255) | Scene name/description |
| description | text | Free text — look, situation, etc. |
| sortOrder | integer | Order within the day |
| requiredExtras | integer | How many extras needed |
| createdAt | timestamp |  |

### extra_scenes (junction)

| Column | Type | Notes |
| --- | --- | --- |
| id | serial, PK |  |
| extraId | integer, FK | → extras.id |
| sceneId | integer, FK | → scenes.id |
| status | enum('proposed','contacted','confirmed','arrived') | Default 'proposed' |
| look | varchar(255) | What look/costume in this scene |
| situation | varchar(255) | What they do in the scene |
| notes | text | Per-assignment notes |
| createdAt | timestamp |  |

### registration_tokens

| Column | Type | Notes |
| --- | --- | --- |
| id | serial, PK |  |
| token | varchar(64) | Unique, URL-safe token |
| isActive | boolean | Can be deactivated |
| createdAt | timestamp |  |

### users

| Column | Type | Notes |
| --- | --- | --- |
| id | serial, PK |  |
| name | varchar(255) | Required |
| email | varchar(255) | Unique, required |
| hashedPassword | varchar(255) | Not used — kept for schema compatibility only |
| image | varchar(500) | Google profile image, nullable |
| role | enum('admin','director','guest') | Default 'director' |
| createdAt | timestamp | Default now |
| updatedAt | timestamp | Auto-update |

---

## Pages Specification

### 1. Login Page — `/login`

- Google sign-in button only
- Session is 30 days by default (no remember me checkbox)
- Hebrew UI, centered card on `--color-bg` background
- Redirect to `/dashboard` on success

### 2. Public Registration Form — `/register/[token]`

- **No authentication required**
- Rate limited: 10 submissions/IP/hour via Upstash
- Token validated against `registration_tokens` table
- Simple form: full name, phone, gender, age, height, weight, has car, availability dates, notes, up to 3 photos
- **No physical attributes** on public form — director adds those manually later
- Photos compressed client-side before upload
- On submit: creates extra with `source: 'public_form'`
- Success: show "!תודה, הפרטים נקלטו" message
- Invalid/expired token: show error page

### 3. Dashboard (Main Screen) — `/dashboard`

- **Today section (היום)**:
    - Show today's shooting day (if exists)
    - List scenes with assigned extras, their status (confirmed/arrived), and times
    - Quick status indicators: ✓ arrived, ⏳ confirmed, ❓ proposed
- **Tomorrow section (מחר)**:
    - Show tomorrow's shooting day (if exists)
    - Highlight gaps: scenes where `assignedExtras < requiredExtras`
    - Show count: "חסרים 3 ניצבים לסצנה 4"
- If no shooting day exists for today/tomorrow, show appropriate message

### 4. Extras List — `/extras`

- Search bar at top right: "...חיפוש לפי שם" (filter by name, client-side)
- "הוספה" button at top left
- List of extra rows (see Row Specification below)
- Infinite scroll or pagination (decide based on dataset size — likely pagination at 50 per page)

### Extra Row Specification (RTL, right-to-left):

Each row is a white card on the background. From right to left:

1. **Three dots menu** (⋮) — dropdown: "עריכה", "מחיקה" (delete shows confirmation modal)
2. **Star toggle** (☆/★) — toggle `isFavorite`, gold when active
3. **Gender icon** — male (blue) / female (pink) icon
4. **Full name** — bold text
5. **Age** — "גיל: 34"
6. **Car icon** — 🚗 icon if `hasCar`, hidden/gray if not
7. **"מאפיינים פיזיים"** button with body icon — expands row downward showing colored tags of all physical attributes
8. **"תאריכים נוחים"** button with calendar icon — expands row showing available (green) and unavailable (red) dates
9. **"מופיע בסצנות"** button with clapperboard icon — expands row showing scenes participated in with look/situation details. If none: shows "לא הופיע בסצנות" and button is visually muted / non-expandable
10. **"מידע נוסף"** button with info icon — expands row showing free text notes + reliability tag
11. **WhatsApp icon** — opens `https://wa.me/{phone}`
12. **Phone icon** — opens `tel:{phone}`
13. **Thumbnail photo** — small square at far left, first photo or placeholder silhouette

**Expand behavior**: Only one section open at a time per row. Clicking another section closes the current one. Expanding pushes the rows below down smoothly (CSS transition).

### 5. Add/Edit Extra — `/extras/new` and `/extras/[id]`

- Full form with all extra fields
- Photo uploader component: drag & drop or click, shows preview, max 5 photos, reorderable
- Physical attributes: select from predefined options (tag picker) + free text input to add custom
- Availability: date picker, toggle available/unavailable per date
- Zod validation on all fields
- Save triggers Server Action → toast on success/error

### 6. Search — `/search`

- Form with filters:
    - Physical attributes (multi-select from tags)
    - Age range (min-max)
    - Gender
    - Available on date(s)
    - Has car
    - Free text search (searches name + notes)
- Results appear below as a list of extra cards (compact version of extras list row)
- Each result has a "הוסף לסצנה" button that opens a scene picker (if navigated from shooting day context)

### 7. Shooting Day Management — `/shooting-days/[id]`

- Header: date, title, director notes (editable free text)
- List of scenes (sortable/reorderable):
    - Scene title + description
    - Required extras count vs assigned count (visual: "5/8 ניצבים")
    - Gap indicator (red badge if under-staffed)
    - List of assigned extras with:
        - Name, thumbnail, status badge (הוצע → נשלחה הודעה → אישר → הגיע)
        - Click to change status (dropdown)
        - Click name to see extra details
    - "הוסף ניצב" button → navigates to search with context
- "העתק סצנה" — duplicate a scene (within same day or to another day)
- "ייצוא לווצאפ" button — generates formatted summary text:
Copies to clipboard with toast "!הועתק ללוח"
    
    ```
    📅 יום צילום: {date}🎬 סצנה 1: {title}   ניצבים: {name1}, {name2}, {name3}🎬 סצנה 2: {title}   ניצבים: {name1}, {name2}   ⚠️ חסרים: 2 ניצבים
    ```
    

### 8. Shooting Days List — `/shooting-days`

- Upcoming shooting days as cards
- "יום צילום חדש" button
- Each card: date, title, scene count, extras count, gap count
- Link to archive

### 9. Shooting Days Archive — `/shooting-days/archive`

- Same as shooting days list but for `isArchived: true`
- Read-only view (no editing)
- Search/filter by date range

---

## Candidate Status Flow (per scene)

```
הוצע (proposed) → נשלחה הודעה (contacted) → אישר (confirmed) → הגיע (arrived)
```

Each status change is logged via the `extra_scenes.status` field. Status is per extra-per-scene.

---

## Environment Variables

```
# Database
DATABASE_URL=                         # Neon connection string

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=                        # Optional, if using custom domain

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Key Implementation Notes

1. **CSS Modules**: Every component has its own `.module.css` file colocated in the same folder (e.g., `Button/Button.module.css`). Import as `import styles from './Button.module.css'`. Use `styles.container`, `styles.card`, etc. **Never use plain `.css` files for components** — always `.module.css`.
2. **No Tailwind**: Do not install or reference Tailwind in any form
3. **Icons**: Use `lucide-react` — import only what's needed
4. **Dates**: Use `date-fns` with Hebrew locale for all date formatting
5. **All text in Hebrew**: All UI labels, placeholders, error messages, empty states — everything in Hebrew
6. **WhatsApp import feature**: Deferred to future phase. Add a disabled/coming-soon button placeholder in the add extra form
7. **Duplicate scene**: When duplicating a scene to another day, copy scene details but NOT extra assignments
8. **Photo placeholder**: When no photo exists, show a gray silhouette avatar icon
9. **Mobile nav**: Bottom tab bar on mobile, sidebar on desktop
10. **Presigned URLs**: Generate short-lived (1 hour) presigned GET URLs for displaying images. Cache the URL in component state for the session to avoid regenerating.
11. **Delete extra**: Soft-delete preferred (add `deletedAt` column) so archive data stays intact. Alternatively, prevent deletion if extra appears in archived shooting days.

---

## Pre-seeded Data

### Physical Attribute Options (attribute_options)

```
מראה אירופאי, מראה מזרחי, מראה אתיופי, מראה רוסי, בלונדיני, ג'ינג'י,
קעקועים, ללא קעקועים, שמנמן, רזה, שרירי, גבוה, נמוך, זקן, צעיר,
עם משקפיים, עם זקן, מגולח, שיער ארוך, שיער קצר, קרח,
אלגנטי, ספורטיבי, היפי, דתי, חרדי
```
