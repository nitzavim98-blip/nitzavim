# ExtraCast — FEATURES.md
# Feature Specification

**Version**: 1.0
**Status**: Active
**Last Updated**: March 2026

---

## Overview

This document lists all features in ExtraCast, organized by product area. Each feature includes its scope (MVP or Phase 2), the page(s) where it lives, and behavioral notes.

---

## 1. Authentication

### 1.1 Sign In — Google OAuth
**Scope**: MVP
**Page**: `/login`

- One-click sign in via Google account
- On first sign-in: creates a `users` row with `role: 'director'` and auto-creates a `productions` row
- Session is valid for 30 days (always long — no "remember me" checkbox)

### 1.2 Session Management
**Scope**: MVP

- JWT strategy via NextAuth.js; token stored in HTTP-only cookie
- All `/(dashboard)` routes protected by middleware — redirect to `/login` if unauthenticated
- Session checked on every Server Action (not only at the route level)

---

## 2. Role-Based Access Control

**Scope**: MVP
**Page**: `/settings`

| Role | Access |
|------|--------|
| `admin` | Full access + user management (add/remove users, change roles) |
| `director` | Full operational access — create, edit, delete all data |
| `guest` | Read-only — view all data, no mutations |

- New users default to `director` role
- Role changes are manual: admin changes another user's role via the settings page
- No self-service role elevation

---

## 3. Extras Management

The central feature of the app. An *extra* (ניצב) is a background performer registered in the production's roster.

### 3.1 Extras List
**Scope**: MVP
**Page**: `/extras`

- Displays all active (non-deleted) extras for the production
- Name-based search bar: client-side filter by `fullName`
- Pagination (50 extras per page) or infinite scroll
- "הוספה" button to add a new extra
- Empty state: "אין ניצבים להצגה" with icon and add CTA

### 3.2 Extra Row
**Scope**: MVP
**Page**: `/extras`

Each extra is a white card row with the following zones (RTL, right to left):

| Zone | Content |
|------|---------|
| Actions | Three-dot menu (⋮), star toggle, gender icon |
| Identity | Full name (bold), age, car icon |
| Expand buttons | Physical attributes, Scenes, Availability, More Info |
| Contact | Phone (`tel:`) and WhatsApp (`wa.me/`) icon links |
| Thumbnail | 48×48px photo or placeholder silhouette |

- Only one expandable section open at a time per row
- Opening a section closes the previously open one
- Active expand button gets `primary-subtle` background + primary color icon
- Expanded section has `--color-bg` background with a white inner card

### 3.3 Star Toggle (Favorites)
**Scope**: MVP

- Toggles `extras.isFavorite`
- Gold star when active; gray when inactive
- Brief `scale(1.25)` animation on toggle
- No separate favorites filter in MVP (visible inline on every row)

### 3.4 Expandable Section: Physical Attributes (מאפיינים)
**Scope**: MVP

- Shows all physical attribute tags assigned to the extra
- Tags displayed as colored pills, rotating through 5 color palettes by index
- Empty state if no attributes assigned

### 3.5 Expandable Section: Scenes (סצנות)
**Scope**: MVP

- Lists all scenes the extra has been assigned to across all shooting days
- Per scene: scene number badge, scene title, role (situation), and outfit (look)
- Empty state: "לא הופיע בסצנות עדיין" with film icon and dashed border card
- If no scenes: expand button is visually muted (non-expandable state)

### 3.6 Expandable Section: Availability (תאריכים)
**Scope**: MVP

- Full monthly calendar grid (7-column, day headers)
- Available dates: green background + border
- Unavailable dates: red background + border
- Today's date: blue ring outline + indicator dot
- Color legend row above the grid

### 3.7 Expandable Section: More Info (מידע)
**Scope**: MVP

- Free text notes paragraph
- Reliability badge:
  - `לא אמין` (0): danger colors
  - `בסדר` (1): warning colors
  - `אמין` (2): success colors

### 3.8 Three-Dot Menu (⋮)
**Scope**: MVP

- "עריכה" → navigates to `/extras/[id]`
- "מחיקה" → opens confirmation modal before soft-deleting

### 3.9 Delete Extra (Soft Delete)
**Scope**: MVP

- Sets `extras.deletedAt = NOW()` — row never physically removed
- Preserves all `extra_scenes` records for archived shooting day integrity
- Confirmation modal before deletion: "האם למחוק ניצב?" + "פעולה זו אינה ניתנת לביטול"

---

## 4. Add / Edit Extra

**Scope**: MVP
**Pages**: `/extras/new`, `/extras/[id]`

### 4.1 Extra Form Fields

| Field | Type | Required |
|-------|------|----------|
| שם מלא | text | Yes |
| טלפון | text | No |
| אימייל | text | No |
| גיל | number | No |
| מגדר | toggle (זכר / נקבה) | Yes (default: זכר) |
| גובה | number (cm) | No |
| משקל | number (kg) | No |
| יש רכב | checkbox | No |
| אמינות | 3-level selector | No (default: אמין) |
| הערות | textarea | No |

- Client-side Zod validation before submit
- Server-side Zod validation in the Server Action (always re-validates)
- Success/error toast notification on save

### 4.2 Physical Attributes Picker
**Scope**: MVP

- Multi-select tag picker from pre-seeded `attribute_options` list
- Free-text input to add a custom attribute (creates new `attribute_options` row if unique)
- Selected attributes shown as pills; click to remove

### 4.3 Availability Date Picker
**Scope**: MVP

- Date picker to add specific dates
- Toggle available / unavailable per date
- Saves to `availability` table (one row per extra per date)

### 4.4 Photo Uploader
**Scope**: MVP

- Drag & drop or click to upload
- Max 5 photos per extra (enforced at upload and display)
- Client-side compression before upload: max 400px width, 70% quality, WebP format
- Drag to reorder photos (updates `sortOrder`)
- Delete individual photos (removes DB row + R2 object)
- Photo with `sortOrder = 0` shown as thumbnail in the extras list
- Placeholder silhouette shown when no photos exist

### 4.5 WhatsApp Import (Coming Soon)
**Scope**: Phase 2

- Disabled placeholder button in the add extra form
- Deferred: parsing WhatsApp chat messages to extract extra details

---

## 5. Public Self-Registration Form

**Scope**: MVP
**Page**: `/register/[token]`

- No authentication required
- Token validated against `registration_tokens` table before rendering
- Invalid or inactive token → error page

### 5.1 Registration Form Fields

| Field | Required |
|-------|----------|
| שם מלא | Yes |
| טלפון | No |
| מגדר | No |
| גיל | No |
| גובה | No |
| משקל | No |
| יש רכב | No |
| תאריכים פנויים | No |
| הערות | No |
| תמונות (עד 3) | No |

- Physical attributes **not** collected on public form — director adds manually after review
- On submit: creates extra with `source: 'public_form'`
- Success message: "!תודה, הפרטים נקלטו"
- Rate limited: 10 submissions per IP per hour (Upstash sliding window)

### 5.2 Registration Token Management
**Scope**: MVP
**Page**: `/settings`

- Director generates shareable registration links (`/register/[token]`)
- Multiple tokens can be active simultaneously
- Director can deactivate a token (sets `isActive = false`)
- No expiry date in v1

---

## 6. Search & Filter

**Scope**: MVP
**Page**: `/search`

### 6.1 Search Filters

| Filter | Type |
|--------|------|
| שם / הערות | Free text (searches `fullName` + `notes`) |
| מאפיינים פיזיים | Multi-select attribute tags |
| טווח גילאים | Min–max number inputs |
| מגדר | Toggle: הכל / זכר / נקבה |
| פנוי בתאריך | Date picker (matches `availability.isAvailable = true`) |
| יש רכב | Checkbox |

- Filters are combined (AND logic)
- Results update on submit

### 6.2 Search Results

- Grid of compact extra cards (thumbnail, name, age, gender icon, car indicator, attribute tags)
- Status badge: "מדורג גבוה" (isFavorite) or "פנוי עכשיו" (available today)
- "הוסף לסצנה" button on each result card
- When navigated from a shooting day context: scene picker opens after clicking "הוסף לסצנה"

### 6.3 Scene Assignment from Search
**Scope**: MVP

- After clicking "הוסף לסצנה", a scene picker is shown
- Lists all scenes for the production with:
  - Scene number, title, date/time, location
  - Status badge: "חסרים ניצבים" or "מלא"
  - "שיבוץ" button — disabled (grayed out) if scene is fully cast
- Selected extra shown in a sticky bottom bar during the flow
- On confirm: creates `extra_scenes` row with `status: 'proposed'`

---

## 7. Shooting Day Management

### 7.1 Shooting Days List
**Scope**: MVP
**Page**: `/shooting-days`

- Cards for all upcoming (non-archived) shooting days
- Per card: date (Hebrew locale), title, scene count, extras count, gap indicator
- Gap chip: "חסרים N ניצבים" in danger color when any scene is under-staffed
- "יום צילום חדש" button to create a new shooting day
- Link to archive

### 7.2 Create / Edit Shooting Day
**Scope**: MVP

| Field | Required |
|-------|----------|
| תאריך | Yes |
| כותרת | No |
| מיקום | No |
| הערות | No |

### 7.3 Shooting Day Detail
**Scope**: MVP
**Page**: `/shooting-days/[id]`

- Header: date navigation (prev/next), "קפוץ לתאריך" date picker, "הוסף סצנה" button, "ייצוא לווצאפ" button
- List of scenes, each as a card

### 7.4 Scene Card
**Scope**: MVP

- Scene number badge, title, description, location/time info
- Required vs. assigned extras counter: "5/8 ניצבים"
- Gap indicator: red badge if `assignedConfirmed < requiredExtras`
- Drag handle for reordering scenes within the day
- Actions: copy scene, edit scene, delete scene
- Assigned extras grid: thumbnail, name, role; click to change status
- "מצא ניצבים" button → navigates to `/search` with scene context
- "שיבוץ מהיר" button (quick assign)

### 7.5 Candidate Status Flow
**Scope**: MVP

Each extra–scene assignment progresses through:

```
הוצע → נשלחה הודעה → אישר → הגיע
```

- Status changed via dropdown on the extra's card within the scene
- `confirmed` + `arrived` count toward filling `requiredExtras`
- `proposed` and `contacted` are NOT counted as filled
- Status is forward-only in the UI (no DB constraint)

### 7.6 Duplicate Scene
**Scope**: Phase 2 (noted in PRD; listed in CLAUDE.md)

- Copies scene `title`, `description`, `requiredExtras`, `sortOrder` to same or another shooting day
- Does **not** copy extra assignments (`extra_scenes`)

### 7.7 WhatsApp Export
**Scope**: MVP

- "ייצוא לווצאפ" button on shooting day detail
- Generates formatted clipboard text:

```
📅 יום צילום: {date}
🎬 סצנה 1: {title}
   ניצבים: {name1}, {name2}, {name3}
🎬 סצנה 2: {title}
   ניצבים: {name1}, {name2}
   ⚠️ חסרים: 2 ניצבים
```

- Copies to clipboard; success toast: "!הועתק ללוח"

### 7.8 Archive Shooting Day
**Scope**: MVP

- Sets `shooting_days.isArchived = true`
- Archived days: read-only (no editing), appears in archive list only
- Edit controls hidden when `isArchived = true`

### 7.9 Archive View
**Scope**: MVP
**Page**: `/shooting-days/archive`

- Same layout as shooting days list, filtered to `isArchived = true`
- Search/filter by date range
- Read-only

---

## 8. Dashboard

**Scope**: MVP
**Page**: `/dashboard`

### 8.1 Today Section (היום)

- Shows today's shooting day (matched by `date = CURRENT_DATE` for this production)
- Lists all scenes with assigned extras, their status, and quick status indicators:
  - ✓ הגיע
  - ⏳ אישר
  - ❓ הוצע
- If no shooting day today: "אין יום צילום היום" with appropriate empty state

### 8.2 Tomorrow Section (מחר)

- Shows tomorrow's shooting day
- Highlights gaps: scenes where `assignedConfirmed < requiredExtras`
- Gap count: "חסרים N ניצבים לסצנה X"
- If no shooting day tomorrow: "אין יום צילום מחר"

---

## 9. Settings

**Scope**: MVP
**Page**: `/settings`

### 9.1 User Management
- Admin only: view all users, change roles (admin / director / guest)
- No self-service role elevation

### 9.2 Registration Token Management
- Generate new registration links
- View existing tokens (active / inactive)
- Deactivate tokens

### 9.3 Physical Attribute Options
- View the pre-seeded attribute list
- Add custom attributes (adds to `attribute_options`, shared across all extras)

---

## 10. UX & System Features

### 10.1 Loading States
- Skeleton components (shimmer/pulse animation) for all data-loading states
- Skeleton rows match exact dimensions of real content

### 10.2 Empty States
- Every list/section shows a centered icon + Hebrew message when empty
- Actionable empty states include a CTA button where appropriate

### 10.3 Toast Notifications
- Success toast: create, update, delete, copy-to-clipboard operations
- Error toast: validation failures, server errors, permission denials
- Position: top-center; entry animation: slide down + fade in

### 10.4 Confirmation Modals
- Shown before all destructive actions (delete extra, delete scene, delete shooting day)
- "האם למחוק?" + "פעולה זו אינה ניתנת לביטול" + cancel / danger-confirm buttons

### 10.5 Responsive Layout
- **Desktop (> 1024px)**: fixed 240px sidebar + content area (max-width 900px)
- **Tablet (768–1024px)**: sidebar collapsed to icon strip
- **Mobile (< 768px)**: single column, bottom tab bar (4 icons, 60px height)

### 10.6 Accessibility
- Full keyboard navigation (Tab + Enter/Space)
- Focus ring on all interactive elements
- Hebrew `aria-label` on all icon-only buttons
- `aria-expanded` on expand/collapse triggers
- Modal: focus trapped, Escape to close, `role="dialog"` + `aria-modal="true"`
- Color never the sole indicator of meaning

### 10.7 Internationalization
- Hebrew only — all UI text, labels, placeholders, error messages, and empty states
- Full RTL layout (`dir="rtl"` on `<html>`)
- Dates formatted with `date-fns` Hebrew locale

---

## 11. Out of Scope (v1)

The following are explicitly excluded from v1:

- Payroll, timesheets, or payment processing
- Union / contract workflows
- Extras-facing accounts or ongoing portal access
- Multi-production or multi-tenant management
- Actor (principal cast) management
- Agency or talent representation features
- Public-facing extras marketplace
- SMS / WhatsApp automated notifications to extras
- CSV / PDF export of the extras roster
- Dark mode
- Arabic language support

---

## 12. Phase 2 Backlog

| Feature | Notes |
|---------|-------|
| WhatsApp import | Parse WhatsApp chat messages to pre-fill extra details |
| Push / email notifications | Reminders for upcoming shooting days |
| Duplicate scene to another day | Copy scene details (not assignments) to a different shooting day |
| CSV export | Export extras roster for sharing with other crew |
| Sentry error tracking | Slot into `src/lib/monitoring.ts` |
| Analytics | Vercel Analytics (one-line enable) |
