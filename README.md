# iVi Forum

**Every cohort. One room.** The member directory and discussion forum for
[I-Venture @ ISB](https://i-venture.org) founders — built by the community, for the community.

Four cohorts of iVi founders had no shared home. This is it: sign up, drop your LinkedIn URL,
and the app builds your profile for you. Then browse the member directory or start a discussion
in the forum.

> Open source under the MIT license so any ISB / iVi developer can build on top of it.
> Community-built — not an official ISB product.

## Features

- **LinkedIn-powered onboarding** — paste your profile URL; an [Apify](https://apify.com) scraper
  pulls your photo, headline, about, experience, education, skills, startup and more into an
  editable profile form. Fill the gaps if you like; only your name is required.
- **Member directory** — searchable card grid (name / startup / skills / company), cohort filter
  chips, rich member profile pages.
- **Forum** — anyone can start a topic; threads follow. Upvote/downvote topics and replies
  (one vote per member, toggle to remove, transactional counts). Sort by New / Top / Active.
- **Email + password accounts** (NextAuth v5 Credentials, bcrypt-hashed). Google OAuth has a
  commented seam in `src/auth.ts` for later.
- **ISB / iVi branding** — palette and logos extracted from the live i-venture.org / isb.edu sites.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, standalone output), TypeScript, Tailwind v4 |
| Auth | NextAuth v5 — Credentials provider, JWT sessions, edge `proxy.ts` route protection |
| Database | Google Cloud Firestore (native mode) — collections `ivi_users`, `ivi_auth`, `ivi_topics` (+ `replies` subcollection), `ivi_votes` |
| LinkedIn scraping | Apify actor `apimaestro~linkedin-profile-batch-scraper-no-cookies-required` (~$0.01/profile, cost-capped per call) |
| Hosting | Google Cloud Run (any container host works) |

Architecture, data model, and API contracts are documented in [SPEC.md](SPEC.md).

## Self-hosting

### Prerequisites

- Node 20+
- A GCP project with Firestore (native mode) enabled — or adapt `src/lib/firestore.ts` to your store
- An [Apify](https://apify.com) account + API token (free tier works for small cohorts)

### Local development

```bash
git clone https://github.com/prasanna0070/ivi-forum
cd ivi-forum
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

`.env.local`:

```
AUTH_SECRET=                 # openssl rand -base64 32
AUTH_URL=http://localhost:3000
APIFY_API_TOKEN=             # from apify.com → Settings → Integrations
APIFY_LINKEDIN_PROFILE_ACTOR=apimaestro~linkedin-profile-batch-scraper-no-cookies-required
GCP_PROJECT=                 # your GCP project id (omit to let ADC infer)
ALLOWED_EMAIL_DOMAINS=       # optional, e.g. "isb.edu" — empty = open signup
```

Firestore auth uses [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials):
locally run `gcloud auth application-default login`; on Cloud Run the runtime service account is
used automatically (grant it `roles/datastore.user`). No JSON key files.

### Deploy to Cloud Run

```bash
gcloud run deploy ivi-forum \
  --source . \
  --region=<your-region> \
  --service-account=<runtime-sa> \
  --allow-unauthenticated \
  --memory=1Gi --timeout=300 \
  --set-secrets="AUTH_SECRET=<secret>:latest,APIFY_API_TOKEN=<secret>:latest" \
  --set-env-vars="GCP_PROJECT=<project>,AUTH_URL=https://<service-url>,AUTH_TRUST_HOST=true"
```

(`deploy.sh` in this repo is the reference deployment used for the original instance.)
The included multi-stage `Dockerfile` (Next standalone, node:20-alpine, port 8080) works on any
container platform.

## Project layout

```
src/
  auth.ts               NextAuth v5 config (Credentials; Google seam commented)
  proxy.ts              Next 16 edge proxy — JWT check on protected routes
  lib/
    types.ts            All shared interfaces (the data contract)
    firestore.ts        Typed data layer — members, topics, replies, transactional votes
    linkedin.ts         Apify scraper client + profile normalizer
    session.ts          requireUser / requireUserApi / requireMember guards
  app/
    page.tsx            Landing + sign in / sign up
    onboarding/         LinkedIn scrape → prefilled editable profile form
    directory/          Member card grid with search + cohort filters
    profile/[uid]/      Full member profile
    forum/              Topics (New/Top/Active), threads, replies, voting
    api/                auth/signup, scrape, profile, topics, replies, votes
  components/           Design system (brand tokens from branding-assets/BRAND.md)
```

## Contributing

PRs welcome — especially from ISB / iVi folks. Keep changes consistent with [SPEC.md](SPEC.md)
(data contracts live in `src/lib/types.ts`). Ideas: Google OAuth, notifications, rich-text posts,
cohort sub-spaces, admin moderation tools.

## License

[MIT](LICENSE) © 2026 Prasanna Kasthurirangan and iVi Forum contributors.
Logos and trademarks of ISB / I-Venture @ ISB belong to their respective owners.
