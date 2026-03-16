# ExtraCast — PRD.md
# Product Requirements Document

**Version**: 1.0  
**Status**: Active  
**Last Updated**: March 2026

---

## 1. Product Overview

### 1.1 What Is ExtraCast?

ExtraCast is a web application built for **third assistant directors (במאי שלישי)** working on Israeli film and television productions. It manages the full lifecycle of extras (ניצבים) — from initial registration and profile management, through search and matching, to scene assignment and on-set tracking.

It is a **single-tenant** tool: one instance per director, per production. It is not a marketplace, an agency platform, or a payroll system.

### 1.2 The One-Line Pitch

> The first dedicated extras management tool built for Israeli productions — replacing the WhatsApp threads, spreadsheets, and memory that third ADs currently rely on.

---

## 2. The Problem

### 2.1 Current Reality

There is no dedicated software for managing extras in Israeli film and TV productions. Third ADs today manage their pool of extras through an improvised combination of:

- **WhatsApp groups and threads** — for recruiting, contacting, and confirming extras
- **Google Sheets or Excel** — for maintaining lists of names, phone numbers, and physical attributes
- **Personal memory** — for knowing who is reliable, who has a car, who looks right for a given scene
- **Paper notes on set** — for tracking arrival and scene assignment

This patchwork approach creates real, recurring pain:

- **Hard to search**: Finding an extra with a specific look (e.g., "European appearance, tall, available Tuesday") requires manually scanning a spreadsheet
- **No visual reference**: Spreadsheets don't hold photos — the AD has to remember faces or scroll through WhatsApp chat history
- **Reliability is invisible**: There's no systematic way to track whether an extra showed up or cancelled last-minute
- **Scene planning is fragile**: Knowing how many extras are confirmed for tomorrow's shoot, and which scenes still have gaps, requires mental tracking or manual counting
- **Registration is manual**: Collecting new extras' details means either handling it by phone or building a custom Google Form for each production
- **Nothing carries over**: Every production starts from scratch — contacts, notes, and history live in old chats and sheets

### 2.2 Why Now

The Israeli film and TV industry has grown significantly in the last decade, with increased investment from international streamers (Netflix, Apple TV+, Amazon) driving larger productions with more complex scheduling demands. Third ADs are managing larger extras pools, shorter prep windows, and higher expectations for organization — with no better tools than they had 15 years ago.

---

## 3. Market & Competitive Landscape

### 3.1 Existing Solutions — Why They Don't Work for Israel

There are established platforms for extras management in other markets:

| Platform | Market | Why It Doesn't Serve Israel |
|----------|--------|-----------------------------|
| **EP Casting Portal** (Entertainment Partners) | US, UK, Canada, Ireland | English-only, payroll/voucher-centric (US union structure), no Hebrew, no Israeli market support |
| **Central Casting** | US | Operates as an agency, not a tool — not self-serve, not available outside the US |
| **HeyCast** | UK, Australia | English-only, built around UK/AU agency model and timesheet workflows, no RTL support |
| **Everyset** | US | Payroll-first product (digital vouchers, union timecards) — irrelevant to Israeli production structure |
| **StudioBinder** | Global | General production management tool — covers scripts, shot lists, call sheets; extras management is a minor feature, not a focus |
| **Yamdu** | Europe | Production management platform — not extras-focused, no Hebrew, complex for a single-role use case |

**The gap is clear**: every meaningful player in this space is English-only, built around US/UK labor and union structures, and not available or adapted for the Israeli market. No Israeli-native alternative exists.

### 3.2 What Competitors Do Well (Reference Points)

These platforms validate what a good extras management tool should include:

- **EP Casting Portal**: Self-registration links for extras, searchable by look/availability, direct messaging, booking confirmations — the right feature set, wrong market
- **HeyCast**: Clean extras database with photo search, scene booking, and agent/director collaboration — good UX model
- **Everyset**: Strong on-set presence tracking (sign-in/sign-out) — relevant inspiration for the arrival status flow

ExtraCast is not trying to replicate these platforms. It takes the core workflow they've proven (register → search → assign → track) and rebuilds it natively for Israeli productions: Hebrew, RTL, no payroll complexity, no union workflows, no agency middleman.

---

## 4. Users

### 4.1 Primary User: Third Assistant Director (במאי שלישי)

The sole user of ExtraCast. There is no extras-facing portal (extras register through a shared link, but do not have accounts or ongoing access).

**Who they are:**
- Freelance crew members working on Israeli film, TV series, and commercial productions
- Responsible for finding, organizing, and managing all extras (background performers) for a production
- Typically working under the first and second ADs, coordinating a pool of tens to hundreds of extras per production
- Highly time-pressured, especially the day before and the day of a shoot
- Work primarily from their phone on set, laptop in prep

**Their core job:**
1. Build and maintain a roster of extras with photos and physical details
2. Match extras to scenes based on look, availability, and reliability
3. Contact and confirm extras for upcoming shooting days
4. Track who showed up on set

**Their pain, in their own words** (representative):
> "אני שומר הכל בראש ובוואטסאפ. כשצריך למצוא מישהו בסגנון מסוים זה בלאגן."  
> ("I keep everything in my head and WhatsApp. When I need to find someone with a specific look, it's a mess.")

### 4.2 Secondary Users (Access Roles, Not Primary Audience)

| Role | Access | Use Case |
|------|--------|----------|
| `admin` | Full + user management | The director themselves, or a trusted production coordinator managing the instance |
| `director` | Full operational access | The primary third AD — the main user |
| `guest` | Read-only | A producer or first AD who wants to view the day's extras without editing anything |

---

## 5. Goals & Success

### 5.1 Product Goals

1. **Eliminate the spreadsheet** — the director's full extras roster lives in ExtraCast, searchable by any attribute
2. **Replace the WhatsApp thread for coordination** — scene assignment, status tracking, and WhatsApp message export all flow from one place
3. **Make tomorrow's gaps visible at a glance** — the dashboard shows exactly which scenes need more extras before the shoot
4. **Make registration frictionless** — a link-based form lets new extras register themselves, with photos, in under 3 minutes

### 5.2 Success Indicators

ExtraCast is working when:

- A director can find a matching extra by look + availability in under 30 seconds
- The morning of a shoot, the director can see all confirmed extras per scene without opening WhatsApp
- New extras are added to the roster with photos and attributes without a phone call
- The director voluntarily uses ExtraCast for the next production, not just the one it was built for

### 5.3 What Success Is NOT

- High daily active user counts (this is a focused production tool — heavy use during prep and shoot days, idle in between)
- Extras using the platform themselves (they register once and have no further interaction)
- Payroll, contracts, or union compliance (explicitly out of scope)
- Multi-production management or agency features (single-tenant, single-production focus)

---

## 6. Core User Flows

### 6.1 Adding a New Extra

**Path A — Director adds manually:**  
Director navigates to `/extras/new`, fills in name, phone, gender, age, physical attributes, uploads photos. Saves. Extra appears in list.

**Path B — Extra self-registers:**  
Director shares a registration link (`/register/[token]`). Extra fills in their own details and uploads up to 3 photos. Director reviews and can add physical attributes manually afterward.

### 6.2 Finding an Extra for a Scene

Director navigates to `/search`, sets filters (look, age range, gender, available on a date, has car). Results display as a list. Director clicks "הוסף לסצנה" to assign directly to a scene.

### 6.3 Planning a Shooting Day

Director opens `/shooting-days/[id]`. Reviews scenes, sees how many extras are confirmed vs. required. Identifies gaps. Navigates to search from a scene's "הוסף ניצב" button. Assigns extras. Updates status as extras confirm.

### 6.4 Day-Of Tracking

Director opens the dashboard on their phone. Sees today's shooting day. Marks each extra as "הגיע" as they arrive on set. Sees real-time confirmed count per scene.

### 6.5 WhatsApp Coordination Export

Director clicks "ייצוא לווצאפ" on a shooting day. Formatted text is copied to clipboard. Director pastes into WhatsApp group. Done.

---

## 7. Key Requirements

### 7.1 Must Have (MVP)

- [ ] Full extras roster with photos, physical attributes, and availability
- [ ] Self-registration form via shareable link (rate-limited, token-validated)
- [ ] Search/filter by any combination of attributes, availability, gender, age, car
- [ ] Shooting day management with scenes and extra assignments
- [ ] Candidate status flow: הוצע → נשלחה הודעה → אישר → הגיע
- [ ] Dashboard showing today's and tomorrow's shooting day status and gaps
- [ ] WhatsApp export for shooting day summary
- [ ] Favorite toggle per extra
- [ ] Reliability tracking (3-level)
- [ ] Archive for past shooting days
- [ ] Hebrew RTL UI throughout
- [ ] Mobile-first responsive design
- [ ] Role-based access (admin / director / guest)

### 7.2 Should Have (Phase 2)

- [ ] WhatsApp import — parse messages to extract extra details (deferred, complex)
- [ ] Notifications or reminders (push or email) for upcoming shooting days
- [ ] Duplicate scene to another shooting day
- [ ] Pagination or infinite scroll on the extras list (50+ extras)

### 7.3 Won't Have (Explicitly Out of Scope)

- Payroll, timesheets, or payment processing
- Union/contract workflows
- Extras-facing accounts or ongoing portal access
- Multi-production or multi-tenant management
- Actor (principal cast) management
- Agency or talent representation features
- Public-facing extras marketplace

---

## 8. Constraints & Assumptions

### Technical Constraints

- **Hebrew only**: all UI text, error messages, empty states, and placeholders must be in Hebrew
- **RTL layout**: the entire app is right-to-left
- **Single-tenant deployment**: one Vercel instance per director
- **No dark mode**: bright mode only, as specified in the design system
- **Mobile must work well**: directors use their phones on set

### Business Assumptions

- The director manages a single ongoing production at a time (one active extras pool)
- Extras pool size: typically 50–300 extras per production
- Shooting schedule: typically 3–6 shooting days per week during active production
- The director is the only person actively managing the system day-to-day

### Data & Privacy

- Extras provide personal data (name, phone, photo, physical attributes) voluntarily via the registration form
- The director is responsible for data handling and any applicable privacy obligations under Israeli law
- Extras do not have accounts and cannot view or edit their own profiles after registering
- Photos are stored in Cloudflare R2 with short-lived presigned URLs — not publicly accessible

---

## 9. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Should extras be notified (SMS/WhatsApp) when their status changes? Or is all communication manual? | Product | Open |
| 2 | Is there a need to export the extras list (CSV, PDF) for sharing with other crew? | Product | Open |
| 3 | Should the registration form support Hebrew and Arabic (for Arab-Israeli extras)? | Product | Open |
| 4 | Is there a hard requirement for GDPR/Israeli Privacy Law compliance documentation? | Legal | Open |
| 5 | WhatsApp import — is this a real priority, or a nice-to-have? What format do directors currently use? | Product | Deferred |