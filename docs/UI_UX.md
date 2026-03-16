# ExtraCast — UI_UX.md

> Reference guide for implementing the ExtraCast interface. Derived from the approved design mockup. Use this alongside `CLAUDE.md` when building any component or page.

---

## Core Design Language

ExtraCast is a **professional production tool**, not a consumer app. The UI should feel like a well-made internal dashboard: clean, information-dense without feeling cluttered, fast to scan, and built for repeated daily use. Every design decision should serve the director's workflow — not aesthetics for their own sake.

**One-line aesthetic**: Functional clarity with warm restraint.

---

## Layout Architecture

### Desktop (> 1024px)

```
┌──────────────────────────────────────────────────────┐
│  HEADER (sticky, 64px)                               │
│  logo | nav links                    | bell | avatar │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│ SIDEBAR  │  PAGE CONTENT                             │
│  240px   │  max-width: 900px, centered               │
│          │                                           │
│  nav     │  page header (title + controls)           │
│  items   │  ─────────────────────────────            │
│          │  content area                             │
│          │                                           │
└──────────┴───────────────────────────────────────────┘
```

### Mobile (< 768px)

```
┌─────────────────────────┐
│  HEADER (sticky, 56px)  │
│  logo          | avatar │
├─────────────────────────┤
│                         │
│  PAGE CONTENT           │
│  padding: 16px          │
│  full width             │
│                         │
├─────────────────────────┤
│  BOTTOM NAV (60px)      │
│  📋   🔍   🎬   ⚙️      │
└─────────────────────────┘
```

### Header

- Height: `64px` desktop / `56px` mobile
- Background: `var(--color-card)`
- Bottom border: `1px solid var(--color-border)`
- `position: sticky; top: 0; z-index: 50`
- Logo: clapperboard icon in `var(--color-primary)` square (32×32px, border-radius 8px) + app name text
- Active nav item: `color: var(--color-primary)` + `border-bottom: 2px solid var(--color-primary)` spanning full header height

### Sidebar

- Width: `240px`, fixed height, scrollable if content overflows
- Background: `var(--color-card)`
- Right border: `1px solid var(--color-border)` (RTL: inline-end)
- Nav items: `48px` height, `padding-inline: 16px`, icon (20px) + label
- Active item: background `var(--color-primary-subtle)`, text + icon `var(--color-primary)`, left accent bar `3px solid var(--color-primary)` (RTL: inline-start)
- Hover: background `var(--color-bg)`

---

## Page Header Pattern

Every main page opens with a consistent header block:

```
┌─────────────────────────────────────────────────┐
│  [Page Title]                [Search] [+ Add]   │
│  [Subtitle / description]                       │
└─────────────────────────────────────────────────┘
```

- Title: `font-size: 1.5rem; font-weight: 700; color: var(--color-text)`
- Subtitle: `font-size: 0.875rem; color: var(--color-text-secondary)`
- Controls aligned to inline-start (left in RTL = right side of screen)
- Margin-bottom: `32px` before content

---

## Extras List — Row Anatomy

The extras list is the most-used view. Each extra is a horizontal card row.

### Row Container

```css
.extraRow {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: background-color 150ms ease;
}
.extraRow:hover {
  background: var(--color-card-hover);
}
.extraRow.expanded {
  border-inline-start: 3px solid var(--color-primary);
}
```

### Row Grid (RTL — right to left)

```
[⋮ menu] [★] [gender] [name / age / car] [expand buttons] [📞 WA] [thumbnail]
```

Column breakdown (desktop):

| Zone | Content | Width |
|------|---------|-------|
| Actions end | ⋮ menu + ★ star + gender icon | ~80px |
| Identity | Full name (bold) + age + car icon | ~200px |
| Expand buttons | 4 icon+label toggle buttons | flex 1 |
| Contact | Phone + WhatsApp icon links | ~100px |
| Photo | Square thumbnail | 48px |

On mobile: collapse to 2 rows — identity + photo on top, expand buttons below.

### Identity Zone

```
יונתן כהן          ← font-weight: 700, font-size: 0.9375rem
גיל: 34  🚗        ← font-size: 0.8125rem, color: --color-text-secondary
```

- Car icon (`Car` from lucide): `16px`, `color: var(--color-primary)` when true, hidden when false
- Gender icon (`User` from lucide): `20px`, `color: var(--color-male)` or `var(--color-female)`

### Star Toggle

- Filled star: `color: var(--color-star); fill: var(--color-star)`
- Empty star: `color: var(--color-star-empty)`
- On click: brief `scale(1.25)` transform, 150ms ease-back

### Expand Trigger Buttons

Four buttons that reveal sections within the row:

| Button | Icon | Hebrew label |
|--------|------|--------------|
| Physical attributes | `Accessibility` | מאפיינים |
| Scenes | `Clapperboard` | סצנות |
| Availability | `Calendar` | תאריכים |
| More info | `Info` | מידע |

**Inactive state:**
```css
color: var(--color-text-secondary);
background: transparent;
border-radius: 8px;
padding: 6px 8px;
```

**Active (section open):**
```css
color: var(--color-primary);
background: var(--color-primary-subtle);
```

**Icon label:**
```css
font-size: 0.625rem;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.08em;
display: block;
margin-top: 2px;
```

### Contact Icons

- Phone (`Phone`): `color: var(--color-primary)`, hover: `background: var(--color-primary-subtle)` circle
- WhatsApp (`MessageSquare`): `color: var(--color-whatsapp)`, hover: `background: #E8FAF0` circle
- Both: `40px` circular touch target, `border-radius: 50%`

### Thumbnail

- Size: `48px × 48px`
- `border-radius: 8px`
- `border: 1px solid var(--color-border)`
- `object-fit: cover`
- Placeholder: centered `UserCircle2` icon from lucide, `color: var(--color-text-muted)`, gray bg

---

## Expandable Sections

### Animation

```css
.expandSection {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 300ms ease-out, opacity 200ms ease-in;
}
.expandSection.open {
  max-height: 800px; /* generous ceiling */
  opacity: 1;
}
```

Add `padding-top: 12px; padding-bottom: 16px` when open (also animate via the class).

### Section Wrapper

```css
.expandInner {
  background: var(--color-bg);          /* inset from card white */
  padding: 0 20px;                       /* horizontal padding matching row */
}
```

### Inner Content Card

Each section's content sits in a white inner card:

```css
.sectionCard {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
}
```

### Section: Physical Attributes

```
מאפיינים פיזיים          ← section title, 0.8125rem bold
──────────────────────────
[מראה אירופאי] [גבוה] [קעקועים] [בלונדיני]   ← tag pills
```

Tags rotate through `--color-tag-1` through `--color-tag-5` palettes by index.

Tag anatomy:
```css
.tag {
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}
```

### Section: Availability

Calendar grid showing dates. For each date:

- **Available**: `background: var(--color-success-subtle); color: var(--color-success); border: 1px solid #B7EBC8`
- **Unavailable**: `background: var(--color-danger-subtle); color: var(--color-danger); border: 1px solid #FECACA`
- **Today**: `ring: 2px solid var(--color-primary)` outline
- Cell: `40px × 40px`, `border-radius: 4px`, `font-size: 0.75rem; font-weight: 700`

Legend row above grid: colored squares + labels in `0.75rem`.

### Section: Scenes

Each scene assignment is a horizontal item:

```
┌────────────────────────────────────────────────────┐
│  [#12]  סצנת בית קפה        תפקיד: לקוח          │
│         ──────────────────                         │
│                              👕 חולצה כחולה, ג'ינס │
└────────────────────────────────────────────────────┘
```

- Scene number badge: `40px × 40px` square, `border-radius: 6px`, `background: var(--color-primary-subtle)`, `color: var(--color-primary)`, `font-weight: 700`
- Scene name: bold, `0.875rem`
- Role: `font-size: 0.75rem; color: var(--color-primary)` with `UserSquare` icon
- Outfit: `font-size: 0.75rem; color: var(--color-text-secondary)` with `Shirt` icon, white pill bg with border

Empty state (no scenes):
```
[Film icon, 32px, --color-text-muted]
לא הופיע בסצנות עדיין
```
Centered, dashed border card.

### Section: More Info

```
הערות ואמינות             ← section title

[free text notes paragraph]

[★★★ אמין]               ← reliability badge
```

Reliability badge colors:
- `לא אמין` (0): `--color-danger-subtle` / `--color-danger`
- `בסדר` (1): `--color-warning-subtle` / `--color-warning`
- `אמין` (2): `--color-success-subtle` / `--color-success`

---

## Status Badge System

Used in shooting day views for candidate flow:

| Status | Hebrew | Background | Text color |
|--------|--------|------------|------------|
| proposed | הוצע | `--color-warning-subtle` | `--color-warning` |
| contacted | נשלחה הודעה | `--color-info-subtle` | `--color-info` |
| confirmed | אישר | `--color-success-subtle` | `--color-success` |
| arrived | הגיע | `var(--color-text)` | `white` |

```css
.statusBadge {
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}
```

---

## Three-Dot Menu (⋮)

```css
.menuTrigger {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--color-text-muted);
  display: flex; align-items: center; justify-content: center;
}
.menuTrigger:hover {
  background: var(--color-bg);
  color: var(--color-text-secondary);
}
```

Dropdown:
- `background: var(--color-card)`, `border: 1px solid var(--color-border)`, `border-radius: 8px`
- `box-shadow: 0 4px 16px rgba(30, 37, 64, 0.08)`
- Items: `padding: 8px 16px`, `font-size: 0.875rem`
- Delete item: `color: var(--color-danger)` with `Trash2` icon

---

## Search Bar

```css
.searchBar {
  position: relative;
  width: 260px;
}
.searchInput {
  width: 100%;
  padding: 8px 12px 8px 36px;   /* icon on inline-start (left in RTL) */
  border: 1px solid var(--color-border-input);
  border-radius: 8px;
  background: var(--color-card);
  font-size: 0.875rem;
  color: var(--color-text);
}
.searchInput:focus {
  border-color: var(--color-primary);
  outline: 2px solid var(--color-primary-subtle);
  outline-offset: 0;
}
.searchIcon {
  position: absolute;
  inset-inline-start: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  width: 16px; height: 16px;
}
```

Placeholder text: `...חיפוש לפי שם`

---

## Primary Button

```css
.btnPrimary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 150ms ease;
  border: none;
  cursor: pointer;
}
.btnPrimary:hover {
  background: var(--color-primary-light);
}
.btnPrimary:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

Icon inside button: `Plus`, `16px`.

---

## Empty States

All empty states follow this pattern:

```
[Icon, 40px, --color-text-muted]

[Primary message]         ← 0.9375rem, font-weight: 500, --color-text-secondary
[Secondary hint]          ← 0.8125rem, --color-text-muted (optional)

[CTA button]              ← optional, only if actionable
```

Centered in the content area, `padding: 48px 0`.

Examples:
- Extras list empty: `Users` icon → "אין ניצבים להצגה" → "+ הוסף ניצב ראשון"
- No scenes: `Film` icon → "לא הופיע בסצנות עדיין"
- No shooting days: `CalendarX` icon → "אין ימי צילום קרובים"

---

## Skeleton Loading

Render skeleton rows matching the exact shape of real content:

```css
@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.skeleton {
  background: var(--color-border);
  border-radius: 4px;
  animation: skeletonPulse 1.4s ease-in-out infinite;
}
```

For extra rows: render 4-6 skeleton rows with:
- Thumbnail: `48px × 48px` square skeleton
- Name: `140px × 14px` rectangle
- Age: `60px × 12px` rectangle
- Buttons: `4 × 40px` rounded rectangles

---

## Modals (Confirmation)

Used for destructive actions (delete extra, delete scene):

```
┌──────────────────────────────┐
│  [Icon]  האם למחוק ניצב?    │  ← title, 1rem bold
│                              │
│  פעולה זו אינה ניתנת לביטול. │  ← body, 0.875rem, --color-text-secondary
│                              │
│  [ביטול]    [מחק]            │  ← cancel (ghost) + confirm (danger)
└──────────────────────────────┘
```

```css
.modal {
  background: var(--color-card);
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 90vw;
  box-shadow: 0 8px 32px rgba(30, 37, 64, 0.12); /* only permitted shadow */
}
.overlay {
  background: rgba(30, 37, 64, 0.4);
  backdrop-filter: blur(2px);
}
```

Danger confirm button: `background: var(--color-danger)`, hover `#C94040`.
Cancel button: `background: transparent`, `border: 1px solid var(--color-border)`, `color: var(--color-text-secondary)`.

---

## Toast Notifications

Position: `top-center`, `z-index: 100`

Entry animation: `transform: translateY(-8px) → translateY(0)`, `opacity: 0 → 1`, `200ms ease-out`
Exit: reverse, `150ms`

```css
.toast {
  background: var(--color-text);  /* deep navy — works for both success/error variants */
  color: white;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
  max-width: 360px;
}
.toastSuccess { border-inline-start: 3px solid var(--color-success); }
.toastError   { border-inline-start: 3px solid var(--color-danger); }
```

---

## Forms

### Input Fields

```css
.input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border-input);
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-card);
  transition: border-color 150ms ease;
}
.input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-subtle);
}
.input::placeholder {
  color: var(--color-text-muted);
}
```

### Form Labels

```css
.label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 4px;
  display: block;
}
```

### Field Groups

Stack labels + inputs with `gap: 6px`. Group related fields with `gap: 16px`. Section breaks within forms: `margin-top: 32px` + optional `<hr style="border-color: var(--color-border)">`.

---

## Shooting Day Card

Used on the shooting days list page:

```
┌──────────────────────────────────────────────────┐
│  יום שלישי, 18 בפברואר 2025    [ראה פרטים →]    │
│  סצנת הבית                                       │
│                                                  │
│  🎬 4 סצנות   👥 12 ניצבים   ⚠️ חסרים 3         │
└──────────────────────────────────────────────────┘
```

- Date: `font-weight: 700; font-size: 1rem`
- Title: `font-size: 0.875rem; color: var(--color-text-secondary)`
- Stats row: icon + count chips, `font-size: 0.8125rem`
- Gap chip: `background: var(--color-danger-subtle); color: var(--color-danger); border-radius: 100px; padding: 2px 8px`

---

## Responsive Behavior

### Extra Row on Mobile

Collapse the horizontal grid into a stacked layout:

```
┌──────────────────────────────────┐
│  [thumbnail 40px]  יונתן כהן    │
│                    גיל: 34  🚗   │
│                    [★] [⋮]       │
├──────────────────────────────────┤
│  [📞] [💬] [📋] [🎬] [📅] [ℹ️]  │
└──────────────────────────────────┘
```

Expand sections are full-width below, same behavior.

### Search Bar on Mobile

Full width below page title, above the extras list.

---

## Accessibility Checklist

- All interactive elements reachable by keyboard (Tab + Enter/Space)
- Focus ring: `outline: 2px solid var(--color-primary); outline-offset: 2px`
- All icon-only buttons have `aria-label` in Hebrew
- Status badges use `role="status"` where applicable
- Color is never the sole indicator of meaning (use icons + text alongside)
- Expand/collapse: `aria-expanded` on trigger buttons
- Modal: focus trapped, `Escape` closes, `role="dialog"` + `aria-modal="true"`

---

## globals.css — Base Setup

```css
/* globals.css — only non-module CSS file */

@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  direction: rtl;
  font-family: 'Heebo', 'Rubik', 'Assistant', sans-serif;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
}

button {
  font-family: inherit;
  cursor: pointer;
}

a {
  color: inherit;
  text-decoration: none;
}

:root {
  /* paste full palette from CLAUDE.md Design System here */
}

@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

---

## Do / Don't Quick Reference

| ✅ Do | ❌ Don't |
|-------|---------|
| Use CSS logical properties (`padding-inline-start`) | Use `padding-left` / `padding-right` directly |
| Icon + micro-label on expand buttons | Icon only (labels aid comprehension) |
| Single section open per row at a time | Allow multiple expanded sections simultaneously |
| Skeleton loading for all async states | Blank screen or spinner-only loading |
| Toast on every mutating action | Silent success or inline-only feedback |
| Hebrew for all copy including error messages | Mix Hebrew and English in UI text |
| `border-radius: 12px` on row cards | Fully square or pill-shaped row cards |
| `lucide-react` icons consistently | Mix icon libraries |
| CSS Modules for every component | Global classes, Tailwind utilities, inline styles |
| No box-shadows (except modals) | Drop shadows on cards or rows |

