# ExtraCast — ARCHITECTURE.md
# System Architecture Document

**Version**: 1.0  
**Status**: Active  
**Last Updated**: March 2026

---

## 1. Architecture Overview

ExtraCast is a **single-tenant, single-deployment** Next.js web application. One Vercel project serves one director. There is no shared infrastructure between instances, no multi-tenancy layer, and no cross-instance data.

The architecture is deliberately simple: a monolithic Next.js app with a serverless Postgres database, object storage for photos, and Redis for rate limiting. No microservices, no message queues, no separate backend.

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT                           │
│          Browser (desktop + mobile)                     │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────┐
│                      VERCEL                             │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │            Next.js 14+ App Router               │   │
│   │                                                  │   │
│   │  ┌──────────────┐   ┌────────────────────────┐  │   │
│   │  │  React Pages  │   │    Server Actions      │  │   │
│   │  │  (RSC + CSC)  │   │    (mutations +        │  │   │
│   │  │               │   │     data fetching)     │  │   │
│   │  └──────────────┘   └────────────────────────┘  │   │
│   │                                                  │   │
│   │  ┌──────────────────────────────────────────┐   │   │
│   │  │              API Routes                   │   │   │
│   │  │  /api/auth        /api/upload/presign     │   │   │
│   │  │  (NextAuth)       /api/upload/delete      │   │   │
│   │  └──────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────┘   │
└──────┬──────────────┬───────────────┬────────────────────┘
       │              │               │
       ▼              ▼               ▼
┌────────────┐ ┌────────────┐ ┌─────────────┐
│    Neon    │ │Cloudflare  │ │  Upstash    │
│  Postgres  │ │     R2     │ │   Redis     │
│            │ │  (photos)  │ │(rate limit) │
└────────────┘ └────────────┘ └─────────────┘
```

---

## 2. Hosting & Deployment

### Platform: Vercel

- **Single project**, single deployment per director instance
- Framework preset: Next.js (auto-detected)
- Region: closest to Israel — `fra1` (Frankfurt) or `cdg1` (Paris) preferred for latency
- Serverless functions run at the edge-adjacent runtime (Node.js 18+)

### Deployment Pipeline

Vercel's default GitHub integration is used with no customization:

```
Push to main branch
      │
      ▼
Vercel detects change
      │
      ▼
Build (next build)
      │
      ├─ Success → Deploy to production
      │
      └─ Failure → Build log in Vercel dashboard, previous deployment stays live
```

- **Production branch**: `main`
- **Preview deployments**: every PR gets a preview URL automatically (Vercel default)
- **No staging environment**: preview deployments serve this purpose
- **No custom CI/CD**: Vercel's built-in pipeline is sufficient

### Environment Management

| Environment | Branch | Database |
|-------------|--------|----------|
| Production | `main` | Production Neon DB |
| Preview | any PR branch | Production Neon DB (shared — previews are read-heavy and safe) |
| Local dev | — | Local Neon branch or dev DB string |

> **Note**: If preview deployments ever need isolated data, Neon's branching feature can provide per-PR database branches — this is a future option, not required now.

---

## 3. Application Layer

### Framework: Next.js 14+ (App Router)

The App Router is used throughout. No Pages Router.

**Rendering strategy by route:**

| Route | Strategy | Reason |
|-------|----------|--------|
| `/dashboard` | Server Component + streaming | Data-heavy, benefits from RSC |
| `/extras` | Server Component + client list | Initial load server-rendered, search is client-filtered |
| `/extras/[id]` | Server Component | Fetch extra data server-side |
| `/extras/new` | Client Component | Form-heavy, all client |
| `/search` | Client Component | Interactive filters, real-time results |
| `/shooting-days` | Server Component | Static-ish list |
| `/shooting-days/[id]` | Server Component + client islands | Day header server, status toggles client |
| `/register/[token]` | Client Component | Public form, no auth |
| `/login` | Client Component | Auth form |

### Server Actions (Primary Data Layer)

All mutations and most data fetching go through Server Actions defined in `src/actions/`. API routes are used only for operations that Server Actions cannot handle.

```
src/actions/
├── extras.ts          # getExtras, getExtra, createExtra, updateExtra, deleteExtra
├── scenes.ts          # getScenes, createScene, updateScene, deleteScene, duplicateScene
├── shooting-days.ts   # getShootingDays, createShootingDay, updateShootingDay, archiveShootingDay
├── search.ts          # searchExtras (complex query with filters)
└── auth.ts            # getCurrentUser, updateUserRole
```

Every Server Action:
1. Checks authentication (session must exist)
2. Checks authorization (role must permit the operation)
3. Validates input with Zod
4. Executes the DB operation via Drizzle
5. Returns typed data or a typed error object

### API Routes (Exceptions Only)

Only three API routes exist, all for operations Server Actions cannot handle:

| Route | Purpose |
|-------|---------|
| `/api/auth/[...nextauth]` | NextAuth.js handler (required by the library) |
| `/api/upload/presign` | Generate R2 presigned upload URL (must be server-side, client initiates direct upload) |
| `/api/upload/delete` | Delete an R2 object by key |

No other API routes. CRUD operations are Server Actions only.

### Middleware

A single `middleware.ts` at the project root handles:

1. **Authentication gate**: redirects unauthenticated users to `/login` for all `/(dashboard)` routes
2. **Token validation**: for `/register/[token]` — validates the token exists and is active before rendering the page
3. **Public routes**: `/login`, `/register/[token]`, and `/api/auth/*` are explicitly excluded from the auth check

```typescript
// middleware.ts — route matcher config
export const config = {
  matcher: [
    '/((?!api/auth|login|register|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

---

## 4. Database

### Provider: Neon Postgres (Serverless)

Neon is used via its serverless HTTP driver (`@neondatabase/serverless`), which is compatible with Vercel's serverless function lifecycle — no persistent connection pool needed.

### ORM: Drizzle

- All queries go through Drizzle's query builder — no raw SQL
- Schema defined in `src/db/schema/` — one file per table
- Migrations managed via `drizzle-kit`
- The Drizzle client is initialized once in `src/db/index.ts` and imported by all Server Actions

```typescript
// src/db/index.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql)
```

### Schema Location

```
src/db/schema/
├── extras.ts
├── photos.ts
├── scenes.ts
├── shooting-days.ts
├── extra-scenes.ts
├── physical-attributes.ts
├── attribute-options.ts
├── availability.ts
├── registration-tokens.ts
└── users.ts
```

### Migration Workflow

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply to database
npx drizzle-kit migrate

# Inspect current schema (dev utility)
npx drizzle-kit studio
```

Migrations run manually before deploying schema changes. No auto-migration on startup.

---

## 5. Authentication

### Provider: NextAuth.js

One sign-in method:

| Method | Use Case |
|--------|---------|
| Google OAuth | Only supported method — one-click sign in with Google account |

**Session strategy**: JWT (`strategy: "jwt"`)  
**Session duration**: 30 days (no "remember me" — always long session)  
**Token storage**: HTTP-only cookie (NextAuth default)

### Role Model

Roles are stored in the `users` table and embedded in the JWT at sign-in:

```
admin     → full access + user management
director  → full operational access (default for new accounts)
guest     → read-only access to all data
```

Role checks happen in Server Actions, not just middleware. Middleware only guards route access (authenticated vs. not). Per-operation role enforcement is in the action itself.

### New User Flow

1. User signs in with Google for the first time
2. NextAuth creates a record in the `users` table with `role: 'director'` (default)
3. An `admin` user can change any user's role via the settings page
4. There is no self-service role elevation — all role changes are manual

---

## 6. Image Storage

### Provider: Cloudflare R2

R2 is S3-compatible object storage. Photos are never routed through the Next.js server — clients upload directly to R2 and the server only stores the object key.

### Upload Flow

```
1. Client compresses image
   (browser-image-compression: max 400px width, 70% quality, WebP)
         │
         ▼
2. Client requests presigned upload URL
   POST /api/upload/presign
   ← returns { uploadUrl, key }
         │
         ▼
3. Client uploads directly to R2
   PUT {uploadUrl} with image binary
         │
         ▼
4. Client saves the key via Server Action
   createPhoto({ extraId, r2Key: key, sortOrder })
```

### Display Flow

```
1. Server Action fetches photo record (r2Key from DB)
         │
         ▼
2. Server generates presigned GET URL
   generatePresignedGetUrl(r2Key, ttl: 3600)
         │
         ▼
3. Presigned URL returned to client
         │
         ▼
4. Client caches URL in component state
   (no re-fetch for the session duration)
```

### Storage Rules

- Max 5 photos per extra (enforced at application layer)
- Object key format: `extras/{extraId}/{timestamp}-{uuid}.webp`
- Photos are private — no public bucket access, only presigned URLs
- Deletion: when a photo is removed, both the DB record and the R2 object are deleted (via `/api/upload/delete`)

---

## 7. Rate Limiting

### Provider: Upstash Redis

Used **exclusively** for the public registration form endpoint. No other route is rate-limited.

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const registrationRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'extracast:register',
})
```

**Limit**: 10 submissions per IP address per hour  
**Window**: Sliding (not fixed)  
**Key**: IP address extracted from the request headers  
**On limit exceeded**: return HTTP 429, show Hebrew error message to user

---

## 8. Data Flow Patterns

### Standard Read (Server Component)

```
Browser requests page
      │
      ▼
Next.js Server Component renders
      │
      ▼
Server Action called directly (no HTTP hop)
      │
      ▼
Drizzle query → Neon Postgres
      │
      ▼
Data returned → Component renders with data
      │
      ▼
HTML streamed to browser
```

### Standard Mutation (Client Component)

```
User submits form
      │
      ▼
Client-side Zod validation
      │ (if invalid → show field errors, stop)
      ▼
Server Action called via React's action binding
      │
      ▼
Server-side Zod validation (always re-validates)
      │
      ▼
Auth + role check
      │
      ▼
Drizzle mutation → Neon Postgres
      │
      ▼
Return { success: true } or { error: string }
      │
      ▼
Client shows toast (success or error)
      │
      ▼
Router.refresh() or revalidatePath() updates UI
```

### Photo Upload (Special Case)

```
User selects image
      │
      ▼
Client compresses (browser-image-compression)
      │
      ▼
POST /api/upload/presign → get { uploadUrl, key }
      │
      ▼
PUT directly to R2 (presigned URL)
      │
      ▼
Server Action: createPhoto({ extraId, r2Key: key })
      │
      ▼
UI updates with new photo thumbnail
```

---

## 9. Error Handling Strategy

### Application Errors (Expected)

Validation failures, not-found records, permission denials — handled inline:

- Server Actions return `{ error: string }` instead of throwing
- Client shows a toast notification with the Hebrew error message
- No error boundaries triggered

### Unexpected Errors (Runtime)

Unhandled exceptions in Server Actions or API routes:

- Next.js catches and returns a 500 response
- The user sees a generic Hebrew error toast: "אירעה שגיאה, נסה שוב"
- Errors are logged to Vercel's built-in function logs (accessible in the dashboard)

### Future: Error Tracking

A third-party error tracking service (e.g., Sentry) is not configured in v1. When added, it slots in as:

```typescript
// src/lib/monitoring.ts  ← future file
import * as Sentry from '@sentry/nextjs'
// Sentry.init({ dsn: process.env.SENTRY_DSN })
```

Vercel's function logs are sufficient for v1 given the single-tenant, low-traffic nature of the app.

---

## 10. Security Model

### Authentication Boundary

- All `/(dashboard)` routes require a valid session — enforced by middleware
- Server Actions re-check session on every call — no trust based on route protection alone
- The public registration form (`/register/[token]`) has no auth, but is token-gated and rate-limited

### Input Validation

- All user input validated with Zod — both client-side (UX) and server-side (security)
- Server-side validation is always authoritative, client-side is convenience only

### File Upload Security

- Clients never get direct write access to R2 — only short-lived presigned URLs for specific operations
- Presigned upload URLs expire in 15 minutes
- Presigned GET URLs expire in 1 hour
- File type is validated before generating the presigned URL (only image/* accepted)

### Secrets

All secrets stored as Vercel environment variables — never in code or committed to the repository:

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

---

## 11. Extensibility Notes

The architecture is intentionally minimal for v1. These are the planned extension points when third-party services are added later:

| Future Service | Integration Point | Notes |
|---------------|-------------------|-------|
| Error tracking (Sentry) | `src/lib/monitoring.ts` + `sentry.*.config.ts` | Vercel has native Sentry integration via marketplace |
| Email notifications | `src/lib/email.ts` | Resend or Postmark recommended for transactional email |
| SMS / WhatsApp API | `src/lib/messaging.ts` | For automated status notifications to extras |
| Analytics | `src/app/layout.tsx` | Vercel Analytics (already available in dashboard, one-line enable) |
| Push notifications | Service Worker + `src/lib/push.ts` | For on-set arrival reminders |

Each future service gets its own `src/lib/` module. No changes to the core Server Action or routing architecture are needed to add any of these.

---

## 12. Local Development Setup

```bash
# Clone and install
git clone <repo>
cd extracast
npm install

# Environment
cp .env.example .env.local
# Fill in: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL=http://localhost:3000
# Google OAuth: set authorized redirect URI to http://localhost:3000/api/auth/callback/google
# R2: use a dev bucket or the same bucket with a dev prefix
# Upstash: same instance is fine for dev (rate limits won't be hit)

# Database
npx drizzle-kit migrate   # apply all migrations
npx drizzle-kit studio    # optional: visual DB browser

# Run
npm run dev               # http://localhost:3000
```

### Key npm Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```