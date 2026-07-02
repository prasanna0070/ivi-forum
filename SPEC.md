# ivi-forum — Build Spec (contract for all builder agents)

**What this is:** A members-only community platform for **I-Venture @ ISB (iVi)** cohort students —
the first forum across all 4 cohorts. Google sign-in → LinkedIn-powered onboarding → member
directory → discussion forum with voting. Deployed on Cloud Run (`ivi-forum`, asia-south1),
open-sourced on GitHub.

**Stack (locked):** Next.js App Router (already scaffolded, `src/` dir, `@/*` alias), TypeScript,
Tailwind v4, `next-auth@beta` (v5) with **Credentials provider (email + password, bcryptjs)** +
JWT sessions, `@google-cloud/firestore` (server-side only — ADC, no key files), Apify for
LinkedIn scraping. Node 20+. (Google OAuth intentionally deferred — design auth.ts so a Google
provider can be added later with minimal change; note the seam in comments.)

**Hard rules for every agent:**
- Own ONLY the files assigned to you (see File Ownership). Never edit another agent's files.
  If you need a shared helper that doesn't exist, create it inside YOUR folder.
- Server components / route handlers may import `@/lib/firestore` directly. NEVER import
  Firestore or any `@/lib/*` server module into a client component.
- All writes go through route handlers or server actions with `await auth()` checks.
- No `any` unless unavoidable; use types from `@/lib/types`.
- Match the visual language: brand tokens are CSS variables in `globals.css` (see Design).
- No secrets in code. Env vars only (see Env).

---

## Data model (Firestore, native mode, default DB, collections prefixed `ivi_`)

### `ivi_auth/{emailLower}` — credential records, keyed by lowercased email
```ts
interface AuthRecord {
  email: string;            // lowercased
  uid: string;              // random UUID minted at signup → key of ivi_users
  passwordHash: string;     // bcryptjs, cost 10
  createdAt: number;
}
```

### `ivi_users/{uid}`  — uid = UUID minted at signup
```ts
interface MemberProfile {
  uid: string;              // UUID from signup
  email: string;            // from signup form (lowercased)
  name: string;             // display name (user-entered at onboarding)
  photoUrl: string | null;  // LinkedIn profile picture URL (fallback: Google picture)
  linkedinUrl: string | null;
  headline: string | null;          // LinkedIn headline
  about: string | null;             // LinkedIn about
  location: string | null;
  cohort: 1 | 2 | 3 | 4 | null;     // iVi cohort number
  startupName: string | null;
  startupDescription: string | null;
  startupWebsite: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  skills: string[];
  experience: { title: string; company: string; duration: string | null;
                location: string | null; description: string | null }[];
  education: { school: string; degree: string | null; fieldOfStudy: string | null;
               period: string | null }[];
  followerCount: number | null;     // LinkedIn stat
  connectionCount: number | null;
  profileComplete: boolean;         // false until onboarding form saved
  lastScrapeAt: number | null;      // epoch ms — for scrape rate limiting
  createdAt: number;                // epoch ms
  updatedAt: number;
}
```
Raw scrape payload is stored at `ivi_users/{uid}/private/scrape` (doc `scrape`, field `raw`) —
never rendered, kept for future re-parsing.

### `ivi_topics/{topicId}` — topicId = auto ID
```ts
interface Topic {
  id: string;
  title: string;            // 1..200 chars
  body: string;             // 0..10000 chars, plain text w/ newlines
  tags: string[];           // 0..5, lowercase
  authorUid: string;
  authorName: string;       // denormalized
  authorPhotoUrl: string | null;
  createdAt: number;
  lastActivityAt: number;   // bumped on every reply
  replyCount: number;
  upCount: number;
  downCount: number;
  score: number;            // upCount - downCount (kept transactionally)
}
```

### `ivi_topics/{topicId}/replies/{replyId}`
```ts
interface Reply {
  id: string;
  topicId: string;
  body: string;             // 1..5000 chars
  authorUid: string;
  authorName: string;
  authorPhotoUrl: string | null;
  createdAt: number;
  upCount: number;
  downCount: number;
  score: number;
}
```

### `ivi_votes/{uid}_{targetId}` — one vote per user per target
```ts
interface Vote {
  uid: string;
  targetType: 'topic' | 'reply';
  targetId: string;         // topicId or replyId
  topicId: string;          // parent topic (same as targetId when targetType=topic)
  value: 1 | -1;
  updatedAt: number;
}
```
Voting is a Firestore **transaction**: upsert/delete the vote doc AND adjust
`upCount`/`downCount`/`score` on the target doc atomically. Clicking the same direction again
removes the vote (toggle); clicking the opposite direction flips it.

---

## Auth flow (email + password — Google OAuth deferred)

- `next-auth@beta` v5. Config in `src/auth.ts`, exported `{ handlers, auth, signIn, signOut }`.
- **Credentials provider**: `authorize({email, password})` → fetch `ivi_auth/{emailLower}` →
  `bcrypt.compare` → return `{ id: uid, email, name }` or null. Env `AUTH_SECRET`; `trustHost: true`.
- **Signup**: `POST /api/auth/signup` `{name, email, password}` (backbone owns) — validates
  (email format, password ≥ 8 chars), rejects existing email (409), bcrypt-hashes (bcryptjs,
  cost 10), transaction-creates `ivi_auth/{emailLower}` + skeleton `ivi_users/{uid}`
  (`profileComplete:false`, name from form). Client then calls NextAuth
  `signIn('credentials', ...)` and lands on `/onboarding`.
- Optional gate: env `ALLOWED_EMAIL_DOMAINS` (comma-separated, e.g. `isb.edu`). Empty/unset = any
  email may sign up. Enforced in the signup route.
- JWT session strategy (no adapter). jwt callback persists `uid`, `email`, `name`.
  Session exposes `session.user.id` (= uid), `email`, `name`.
- Route protection: unauthenticated users hitting `/directory`, `/forum`, `/onboarding`,
  `/profile`, `/api/scrape`, `/api/topics`, `/api/votes`, `/api/profile` → redirect to `/`
  (APIs return 401 JSON instead of redirect). NOTE: Next 16 renamed `middleware.ts` →
  `proxy.ts` — use whichever the installed Next major requires; if edge-runtime friction
  arises, protecting via `requireUser()` in layouts/handlers alone is an acceptable fallback.
- Signed-in but `profileComplete === false` → app-level redirect to `/onboarding` (checked in the
  directory/forum layouts via a shared `requireMember()` helper in `src/lib/session.ts`).
- Passwords: never logged, never returned by any API. `ivi_auth` is never read outside auth.ts
  and the signup route.

## Onboarding flow (the "magic" moment)

1. `/onboarding` — step 1: LinkedIn profile URL (accepts any linkedin.com/in/… form). Name is
   already known from signup — show it ("Welcome, {name}") with an inline edit affordance.
   A "skip — fill manually" link goes straight to the empty form (step 3).
2. Client POSTs `/api/scrape` `{ linkedinUrl }` → server calls Apify (see lib/linkedin below),
   normalizes, stores raw payload, returns `Partial<MemberProfile>` prefill. Show a warm progress
   state while it runs (20–60s): e.g. "Reading your LinkedIn… building your profile…".
3. Step 2: the prefilled, fully-editable profile form (photo preview, headline, about, location,
   cohort select, startup fields, title/company, skills chips, experience/education lists).
   Unfilled fields stay empty — user MAY fill them, nothing except name is mandatory.
4. Save → POST `/api/profile` → writes `ivi_users/{uid}` with `profileComplete: true` → redirect
   `/directory`.
5. Scrape failure is non-fatal: show "couldn't read your LinkedIn — fill what you like" and
   present the empty form.

Rate limits: max 1 scrape per user per 10 min (`lastScrapeAt`), max 3 per user per day.
Re-scrape from profile edit is allowed under the same limits.

## Pages

| Route | Owner | Description |
|---|---|---|
| `/` | backbone | Branded landing: iVi logo, one-liner, and an auth card with **Sign in / Sign up tabs** (sign up: name, email, password; sign in: email, password; inline errors). If session → redirect `/directory` (or `/onboarding` if !profileComplete). |
| `/onboarding` | onboarding | 2-step flow above. |
| `/directory` | directory | Default post-login page. Responsive card grid of members (photo, name, headline, cohort badge, startup, location; LinkedIn icon link). Client-side search box (name/startup/skills/company) + cohort filter chips. |
| `/profile/[uid]` | directory | Full member profile (all fields, experience/education timelines, skills chips, link to LinkedIn). "Edit profile" button when own profile → `/onboarding?edit=1` (onboarding form reused in edit mode, prefilled from Firestore, NO re-scrape unless user clicks re-scrape). |
| `/forum` | forum | Topic list. Tabs: **New** (createdAt desc) / **Top** (score desc) / **Active** (lastActivityAt desc). Each row: vote column (▲ score ▼), title → thread, tags, author avatar+name, reply count, relative time. "Start a topic" button opens composer (title, body, tags). |
| `/forum/[topicId]` | forum | Thread: topic (votable), replies list (each votable, New|Top toggle), reply composer at bottom. |

Shared chrome (backbone): sticky header with iVi logo (links `/directory`), nav links Directory ·
Forum, user avatar menu (My profile, Sign out). Footer: "Open source · GitHub" link +
"Built by the iVi community · Not an official ISB product".

## API routes

| Route | Owner | Contract |
|---|---|---|
| `POST /api/auth/signup` | backbone | `{name, email, password}` → 200 `{ok:true}` \| 409 email exists \| 400 validation |
| `POST /api/scrape` | onboarding | `{linkedinUrl}` → 200 `{ok:true, prefill: Partial<MemberProfile>}` \| `{ok:false, error}` (401/429/502 as appropriate) |
| `POST /api/profile` | onboarding | Body = editable subset of MemberProfile → validates → upserts `ivi_users/{uid}`, sets profileComplete, returns `{ok:true}` |
| `POST /api/topics` | forum | `{title, body, tags}` → creates topic → `{ok:true, id}` |
| `POST /api/topics/[id]/replies` | forum | `{body}` → creates reply, bumps replyCount + lastActivityAt (transaction) |
| `POST /api/votes` | forum | `{targetType, targetId, topicId, value: 1\|-1}` → toggling transaction (see Data model) → returns fresh `{upCount, downCount, score, myVote}` |

Reads happen in server components via `@/lib/firestore` (no read APIs needed). Directory reads
all `ivi_users` where profileComplete (cohort size ≈ dozens–hundreds; no pagination needed v1;
order by name). Forum list: limit 50 per tab.

## lib/linkedin.ts (backbone) — port of the Quarktex scraper

Port the normalizer from the Quarktex agent (Python) at
`"/Users/prasanna/Documents/personal os/project quarktex/quarktex v1.217 beta - agent id /agents/qt-profile-contact-scraper/app/tools.py"`
(read it — the field mapping at lines ~103–137 and `basic_info` lifting at ~215 are the reference).

- `canonicalizeLinkedInUrl(input: string): string | null` — accept `linkedin.com/in/<slug>` in any
  form (with/without https, www, trailing slash, query junk, bare slug) → `https://www.linkedin.com/in/<slug>` ; null if not parseable.
- `scrapeLinkedInProfile(url: string): Promise<{ok: boolean; profile?: NormalizedLinkedIn; raw?: unknown; error?: string}>`
  - `POST https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}&memory=1024&timeout=240&maxTotalChargeUsd=0.10`
  - actor = env `APIFY_LINKEDIN_PROFILE_ACTOR` default `apimaestro~linkedin-profile-batch-scraper-no-cookies-required` (replace `/`→`~`)
  - body `{"usernames": [url], "includeEmail": false}`
  - Treat any 2xx as success. First dataset item may nest identity under `basic_info` — lift it.
  - Map to `NormalizedLinkedIn` (name, headline, about, location, profilePictureUrl,
    currentTitle, currentCompany, followerCount, connectionCount, skills (top_skills),
    experience[], education[]) → then to `Partial<MemberProfile>`.
- 90s fetch timeout on our side; on Apify failure return `{ok:false,error}` — caller degrades
  gracefully.

## Design (brand)

- Brand tokens live in `src/app/globals.css` as CSS variables consumed by Tailwind v4 `@theme`:
  `--color-brand` (ISB deep blue — placeholder `#003A70` until branding-assets/BRAND.md lands,
  orchestrator will finalize), `--color-brand-light`, `--color-accent` (ISB gold/amber),
  `--color-surface`, `--color-ink`. USE ONLY THESE TOKENS for brand colors — never hardcode hexes
  in components (utilities like `bg-brand`, `text-brand`, `bg-accent` will exist via @theme).
- Logos: `branding-assets/` → backbone copies chosen files into `public/brand/`. Header uses
  `/brand/ivi-logo.*` (fallback: text wordmark "iVi Forum" in brand color if asset missing).
- Look: institutional-clean like isb.edu — white surfaces, deep-blue headers/CTAs, generous
  whitespace, rounded-xl cards with subtle borders (not shadow-heavy), Inter or similar font.
- Every page must look composed: empty states designed ("No topics yet — start the first
  discussion"), loading skeletons for directory/forum.

## Env vars (.env.example — backbone writes it)

```
AUTH_SECRET=            # openssl rand -base64 32
AUTH_URL=               # https://<cloud-run-url> in prod
APIFY_API_TOKEN=
APIFY_LINKEDIN_PROFILE_ACTOR=apimaestro~linkedin-profile-batch-scraper-no-cookies-required
GCP_PROJECT=            # Firestore project (defaults to ADC project if unset)
ALLOWED_EMAIL_DOMAINS=  # optional, comma-separated; empty = open
```

## File ownership

- **backbone**: `src/auth.ts`, `src/middleware.ts`/`src/proxy.ts`, `src/lib/{types.ts,firestore.ts,linkedin.ts,session.ts,format.ts}`,
  `src/app/{layout.tsx,page.tsx,globals.css}`, `src/app/api/auth/**` (NextAuth handler + signup),
  `src/components/{Header.tsx,Footer.tsx,Avatar.tsx,Badge.tsx,Card.tsx,Skeleton.tsx,AuthCard.tsx}`,
  `Dockerfile`, `.dockerignore`, `.env.example`, `next.config.ts`, `public/brand/*`
- **onboarding**: `src/app/onboarding/**`, `src/app/api/{scrape,profile}/**`, `src/components/onboarding/**`
- **directory**: `src/app/directory/**`, `src/app/profile/**`, `src/components/directory/**`
- **forum**: `src/app/forum/**`, `src/app/api/{topics,votes}/**`, `src/components/forum/**`

## Deploy (orchestrator handles)

Cloud Run `ivi-forum`, asia-south1, runtime SA `ivi-forum-run@`, `next.config.ts` →
`output: 'standalone'`, Dockerfile multi-stage (node:20-alpine, standalone server.js), port 8080
via `PORT` env. Secrets via `--set-secrets`. Request timeout 300s (scrape route can take ~60s).
