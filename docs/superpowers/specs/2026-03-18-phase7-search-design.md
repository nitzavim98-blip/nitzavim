# Phase 7 — Search: Design Spec

**Date**: 2026-03-18
**Status**: Approved
**Phase**: 7 of 10

---

## Overview

The Search page (`/search`) lets the director filter the extras roster by any combination of criteria and assign results directly to a scene. It integrates with the existing shooting-day flow: `SceneBlock` already links to `/search?sceneId={id}`.

---

## Architecture Decision: URL-Driven Filters

All filter state lives in URL search params. The page is a Server Component that reads params, calls `searchExtras` server-side, and passes results to client components. Submitting the form does a `router.push` with new params.

**Why**: Filters survive the round-trip (navigate → search → assign → back-navigate). Back button restores filter state. Combines cleanly with the `?sceneId` context param already used by `SceneBlock`.

---

## 1. Data Layer

### `src/lib/validations/search.ts`

Zod schema `searchFiltersSchema` — all fields optional. Export the inferred type:
```typescript
export type SearchFilters = z.infer<typeof searchFiltersSchema>
```
This type is imported by `SearchForm` to type `initialFilters`. No separate interface — always derive from the Zod schema.

Fields:

| Field | Type | Behavior |
|-------|------|---------|
| `q` | `string` | ILIKE `%q%` on `fullName` OR `notes` |
| `attributeIds` | `number[]` | Extra must have ALL selected (AND logic) |
| `minAge` | `number` | `age >= minAge` |
| `maxAge` | `number` | `age <= maxAge` |
| `gender` | `0 \| 1` | Exact match; omitted = no filter |
| `availableOnDate` | `string` (YYYY-MM-DD) | Extra has explicit `availability` row with `isAvailable = true` for that date. Extras with no row for that date are excluded (treated as "data not entered", not "available"). |
| `hasCar` | `boolean` | `hasCar = true` when `true`; omitted = no filter |

Filters combine with AND logic.

### `src/actions/search.ts`

`searchExtras(filters: unknown)` — no explicit `productionId` parameter:

- Calls `getCurrentProduction()` internally to scope the query (consistent with all other actions)
- Runs `searchFiltersSchema.safeParse(filters)` internally — returns `{ error: 'פרמטרים לא תקינים' }` if invalid (satisfies CLAUDE.md requirement: "Always validate in Server Actions even if client already validated")
- Base: `extras` table, `deletedAt IS NULL`, scoped to `productionId`
- Attribute filter: subquery — `id IN (SELECT extraId FROM extra_attributes WHERE attributeId IN [...] GROUP BY extraId HAVING COUNT(DISTINCT attributeId) = N)` where N = number of selected attributes
- Date filter: `id IN (SELECT extraId FROM availability WHERE date = ? AND isAvailable = true)`
- Returns per extra: all fields + primary photo R2 key (`sortOrder = 0`) + all linked attribute labels + `isFavorite`. `reliability` is intentionally excluded from `SearchResult` — it is not displayed on search result cards.
- Generates presigned GET URLs for thumbnails inline (1-hour TTL, same pattern as `getSceneAssignmentsForDay`)
- Returns `{ data: SearchResult[] }` or `{ error: string }`

```typescript
type SearchResult = {
  id: number
  fullName: string
  age: number | null
  gender: number
  hasCar: boolean
  isFavorite: boolean
  phone: string | null
  attributes: { id: number; label: string }[]
  thumbnailUrl: string | null
}
```

---

## 2. Page & URL Routing

### `src/app/(dashboard)/search/page.tsx` — Server Component

Reads `searchParams`:
- `q`, `attributeIds` (comma-separated string e.g. `"1,3,5"`), `minAge`, `maxAge`, `gender`, `availableOnDate`, `hasCar`
- `sceneId` — scene context (from `SceneBlock` "מצא ניצבים" button)

**Param parsing** (done in the page before calling the action):
- `attributeIds`: split by `,`, map to `Number`, filter out `NaN` → `number[]`
- `minAge`, `maxAge`, `gender`: `Number(param)` — skip if param is undefined
- `hasCar`: `param === 'true'`
- Pass the parsed object directly as the `filters` argument to `searchExtras`; the action runs Zod validation internally

Logic:
1. If `sceneId` present: fetch scene + shooting day info server-side (via `getScene(sceneId)` + `getShootingDay(shootingDayId)`) to build `SceneContextData` and pass to child components
2. If any filter params present: call `searchExtras(parsedFilters)`, pass results to `SearchResults`
3. If no filter params: pass `null` results (renders "initial" empty state)
4. Fetch all `attributeOptions` server-side for `SearchForm` pills
5. Fetch `getScenesForPicker()` server-side and pass result as prop to `SearchResults` (so `ScenePicker` in Mode B never needs to fetch on mount)

**URL shape examples:**
```
/search
/search?q=יונתן
/search?attributeIds=1,3&minAge=25&maxAge=40&gender=1
/search?sceneId=12
/search?sceneId=12&attributeIds=5&hasCar=true
```

### Scene context banner

When `?sceneId` is present: sticky strip at top of page (rendered directly in `page.tsx`, not a child component):
- Text: "משבץ ניצב לסצנה: {sceneTitle}"
- × button: navigates back to `/shooting-days/{shootingDayId}` (the `shootingDayId` comes from the scene fetched server-side)
- Styled with `--color-primary-subtle` background, `--color-primary-text` text

---

## 3. Components

### `src/components/search/SearchForm/`

**Type**: Client Component
**Props**: `{ initialFilters: SearchFilters; attributeOptions: AttributeOption[]; sceneId?: number }`

Behavior:
- Pre-fills all fields from `initialFilters` (already parsed from URL params by the page)
- On submit: builds new URLSearchParams (serializes `attributeIds` back to comma-separated), calls `router.push('/search?' + params)`, preserving `sceneId` if present
- "נקה סינון" resets to `/search` (or `/search?sceneId=X` if in context)

Fields layout (RTL, stacked):
1. Text input — placeholder "חיפוש לפי שם או הערות..."
2. Attribute pills — all `attributeOptions` as selectable pills, rotate tag palette colors, active = filled
3. Age range — two number inputs side by side: "גיל מינימום" / "גיל מקסימום"
4. Gender radio — 3 options: "הכל" / "זכר" / "נקבה"; default "הכל"
5. Available on date — single date input: "פנוי בתאריך"
6. Has car — checkbox: "יש רכב"
7. Submit button: "חפש" (primary)
8. Reset link: "נקה סינון" (text button, muted)

---

### `src/components/search/SearchResults/`

**Type**: Client Component
**Props**: `{ results: SearchResult[] | null; sceneId?: number; sceneContext?: SceneContextData; pickerScenes: PickerDay[] }`

States:
- `results === null` (no search submitted yet): `Search` icon + "הגדר סינון וחפש ניצבים"
- `results.length === 0` (search returned nothing): `Search` icon + "לא נמצאו ניצבים התואמים לחיפוש"
- `results.length > 0`: result count "נמצאו N ניצבים" + card grid

**Card grid**: `grid-template-columns: repeat(4, 1fr)` desktop → 2 tablet → 1 mobile

**Extra card**:
- Square thumbnail (aspect-ratio 1:1, border-radius 8px) or `UserCircle2` placeholder
- Name (bold) + age
- Gender icon (`--color-male` / `--color-female`)
- Car icon (shown only if `hasCar`)
- Top 3 attribute tags (tag palette, pill shape)
- "מועדף" badge (indigo) if `isFavorite`
- "הוסף לסצנה" button — opens `ScenePicker` modal

Hover: border transitions from `--color-border` to `--color-primary-light` (no box-shadow)

---

### `src/components/search/ScenePicker/`

**Type**: Client Component
**Props**:
```typescript
type ScenePickerProps = {
  extra: SearchResult
  sceneId?: number
  sceneContext?: SceneContextData   // provided only when sceneId is present
  pickerScenes: PickerDay[]         // pre-fetched by Server Component, always provided
  onClose: () => void
}

// Exported from src/actions/scenes.ts and imported by ScenePicker
type SceneContextData = {
  scene: {
    id: number
    title: string
    requiredExtras: number
    assignedCount: number   // confirmed + arrived only (same rule as SceneBlock gap calculation)
  }
  shootingDay: { id: number; date: string; title: string | null }
}

// Exported from src/actions/scenes.ts and imported by ScenePicker
type PickerDay = {
  shootingDay: { id: number; date: string; title: string | null }
  scenes: {
    id: number
    title: string
    sortOrder: number
    requiredExtras: number
    assignedCount: number  // confirmed + arrived only
  }[]
}
```

**Mode A — with `sceneId` context** (navigated from shooting day):
- Shows single scene details using `sceneContext`: title, date, current gap ("חסרים N מתוך M")
- "שבץ" confirm button → calls `assignExtra(extra.id, sceneId)` → success toast → `router.push('/shooting-days/{shootingDayId}')`
- On error (e.g. already assigned): show error toast, close modal

**Mode B — without `sceneId`** (standalone search):
- Renders `pickerScenes` prop directly — NO data fetching in the component
- Scenes grouped by shooting day date (date as section header)
- Each scene row: scene number badge, title, date, gap badge ("חסרים N" in danger color, or "מלא" in success color)
- Fully cast scenes (`gap === 0` where `gap = requiredExtras - assignedCount`): grayed out, "שבץ" button disabled + `cursor-not-allowed`
- On confirm: calls `assignExtra`, success toast, `router.push('/shooting-days/{shootingDayId}')`
- On error: show error toast, close modal (same behavior as Mode A)

Modal styling: `max-width: 480px`, `border-radius: 16px`, single permitted shadow.

---

## 4. New Server Action: `getScenesForPicker`

Added to `src/actions/scenes.ts`:

```typescript
getScenesForPicker(): Promise<{ data: PickerDay[] } | { error: string }>
```

- Calls `getCurrentProduction()` internally (consistent with all other actions in scenes.ts)
- Fetches all non-archived shooting days for production, ordered by date ascending
- Per day: fetches all scenes with `assignedCount` computed as `COUNT(extra_scenes.id) WHERE status IN ('confirmed', 'arrived')` — consistent with `attachStats` in `shooting-days.ts` and gap calculation in `SceneBlock`
- Returns `{ data: PickerDay[] }` or `{ error: string }`

---

## 5. Integration Points

- **`SceneBlock`**: already links to `/search?sceneId={id}` — no changes needed
- **`assignExtra`** in `src/actions/extra-scenes.ts`: already handles duplicate check, returns `{ error }` if already assigned — reuse as-is. `ScenePicker`'s "שבץ" button must be hidden for `guest`-role users (consistent with CLAUDE.md: guests have read-only access). The page should pass `session.user.role` to `SearchResults` and `ScenePicker` should conditionally render the button only when `role !== 'guest'`.
- **`getAttributeOptions`** in `src/actions/attributes.ts`: reuse for form pills
- **CSS**: use existing tag palette variables (`--color-tag-1` through `--color-tag-5`) for attribute pills
- **`getScene`**: the page needs to call this to resolve `sceneId` → `shootingDayId` for the context banner. This is the existing `getScene` action if it exists, otherwise a simple query in the page.

---

## 6. File Checklist

```
src/lib/validations/search.ts
src/actions/search.ts
src/app/(dashboard)/search/page.tsx
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

Plus: extend `src/actions/scenes.ts` with `getScenesForPicker`.

---

## 7. Acceptance Criteria

- [ ] Search page renders filter controls with correct Hebrew labels
- [ ] Attribute pills are multi-selectable and visually distinct when active
- [ ] Submitting filters returns correct results from DB
- [ ] Filter params round-trip correctly through URL (back-navigation restores filter state)
- [ ] `?sceneId` param is preserved through filter changes (changing filters does not drop sceneId from URL)
- [ ] Empty results state: `Search` icon + "לא נמצאו ניצבים התואמים לחיפוש"
- [ ] Initial state (no search yet): `Search` icon + "הגדר סינון וחפש ניצבים"
- [ ] Navigating from a scene's "מצא ניצבים" shows context banner with scene title
- [ ] Context banner × button navigates back to the correct shooting day detail page
- [ ] Assigning an extra from search (with context) redirects to shooting day detail
- [ ] Scene picker (no context) shows all scenes grouped by day with gap status
- [ ] Fully cast scenes in scene picker are disabled
- [ ] Gap calculation uses `confirmed + arrived` only (not `proposed` or `contacted`)
- [ ] Results show primary photo thumbnail or `UserCircle2` placeholder
- [ ] Extras with no availability record are excluded when `availableOnDate` filter is active
