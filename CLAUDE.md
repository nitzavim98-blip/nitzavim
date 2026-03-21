# ExtraCast — CLAUDE.md

## Project Overview

ExtraCast is a web app for **third assistant directors** (במאי שלישי) managing extras (ניצבים) in Israeli film/TV productions. Single-tenant deployment — one director per instance. Hebrew only, full RTL layout throughout.

For detailed specs, see:
- `docs/Architecture.md` — system architecture, folder structure, data flow
- `docs/DATA_MODEL.md` — full database schema
- `docs/UI_UX.md` — design system (colors, typography, spacing, components)
- `docs/FEATURES.md` — pages specification and feature list

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

## Critical Coding Rules

1. **CSS Modules only** — every component has `ComponentName.module.css` colocated. Never plain `.css` for components. No Tailwind.
2. **Icons** — `lucide-react` only, import only what's needed. `20px` action icons, `16px` inline icons.
3. **Server Actions** for all mutations and most data fetching. API routes only for presigned URLs and webhooks.
4. **Drizzle query builder** — no raw SQL.
5. **Zod validation** in every Server Action (even if client already validated). Schemas in `src/lib/validations/`.
6. **All text in Hebrew** — labels, placeholders, error messages, empty states.
7. **RTL** — `dir="rtl"` on `<html>`, CSS logical properties preferred.
8. **Loading states** — skeleton components (shimmer/pulse). **Empty states** — centered Hebrew message with icon. Never blank screen.
9. **Dates** — `date-fns` with Hebrew locale.
10. **Soft-delete** extras (`deletedAt` column).
11. **Rate limiting** — Upstash, only on public registration endpoint (10/IP/hour, sliding window).
12. **Images** — client compresses before upload (max 400px, 70% quality, WebP). DB stores R2 key, not URL. Max 5 photos per extra. Presigned GET URLs TTL: 1 hour.
13. **Auth roles**: `admin` (full + user mgmt), `director` (full ops), `guest` (read-only). New users default to `director`.
14. **Toast notifications** — success on add/edit/delete, error on failures. Top-center position.

---

## Environment Variables

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Candidate Status Flow

```
הוצע (proposed) → נשלחה הודעה (contacted) → אישר (confirmed) → הגיע (arrived)
```

Status stored per extra-per-scene in `extra_scenes.status`.
