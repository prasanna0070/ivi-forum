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
- **Passwordless sign-in** — enter your ISB email, get a 6-digit code (sent via
  [Resend](https://resend.com)), and you're in. Email + password (NextAuth v5 Credentials,
  bcrypt-hashed) stays as a fallback for existing accounts.
- **Email notifications** — members get an email when a new post matches their interest tags,
  when they're @-mentioned, when someone replies to their post, or when someone replies to
  their reply — plus a welcome email on joining. Every notification carries a one-click
  unsubscribe link, and there's a toggle on the profile edit page.
- **ISB / iVi branding** — palette and logos extracted from the live i-venture.org / isb.edu sites.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, standalone output), TypeScript, Tailwind v4 |
| Auth | NextAuth v5 — email OTP + password Credentials providers, JWT sessions, edge `proxy.ts` route protection |
| Database | Google Cloud Firestore (native mode) — collections `ivi_users`, `ivi_auth`, `ivi_topics` (+ `replies` subcollection), `ivi_votes` |
| Email | [Resend](https://resend.com) REST API — sign-in codes + notification emails; dormant (and hidden in the UI) until `RESEND_API_KEY` is set |
| LinkedIn scraping | Apify actor `apimaestro~linkedin-profile-batch-scraper-no-cookies-required` (~$0.01/profile, cost-capped per call) |
| Hosting | Google Cloud Run (any container host works) |

Architecture, data model, and API contracts are documented in [SPEC.md](SPEC.md).

## Self-hosting

### Prerequisites

- Node 20+
- A GCP project with Firestore (native mode) enabled — or adapt `src/lib/firestore.ts` to your store
- An [Apify](https://apify.com) account + API token (free tier works for small cohorts)
- Optional: a [Resend](https://resend.com) account with a verified sending domain — without it the
  app still runs, but OTP sign-in and notification emails stay dormant (password sign-in only)

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
RESEND_API_KEY=              # optional — enables OTP sign-in + notification emails
EMAIL_FROM=                  # optional, e.g. "iVi Forum <forum@your-domain.com>" — must be
                             # on a domain verified in Resend (Domains → Add Domain → DNS)
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

To enable email, store your Resend key in Secret Manager
(`printf '%s' "$KEY" | gcloud secrets create ivi-forum-resend-api-key --data-file=-`), add
`RESEND_API_KEY=ivi-forum-resend-api-key:latest` to `--set-secrets`, and add `EMAIL_FROM` to
`--set-env-vars` — careful: `--set-env-vars` splits on commas, so the value must not contain one.

(`deploy.sh` in this repo is the reference deployment used for the original instance — it wires
up the Resend secret automatically when it exists.)
The included multi-stage `Dockerfile` (Next standalone, node:20-alpine, port 8080) works on any
container platform.

## Project layout

```
src/
  auth.ts               NextAuth v5 config (email OTP + password Credentials providers)
  proxy.ts              Next 16 edge proxy — JWT check on protected routes
  lib/
    types.ts            All shared interfaces (the data contract)
    firestore.ts        Typed data layer — members, topics, replies, transactional votes
    linkedin.ts         Apify scraper client + profile normalizer
    email.ts            Resend transport — sendEmail / sendEmails / sendOtpEmail
    emailTemplates.ts   Branded subject + html + text builders for every email
    unsubscribe.ts      HMAC one-click-unsubscribe tokens for email footers
    session.ts          requireUser / requireUserApi / requireMember guards
  app/
    page.tsx            Landing + sign in / sign up
    onboarding/         LinkedIn scrape → prefilled editable profile form
    directory/          Member card grid with search + cohort filters
    profile/[uid]/      Full member profile
    forum/              Topics (New/Top/Active), threads, replies, voting
    api/                auth (signup, otp), email/unsubscribe, scrape, profile, topics, replies, votes
  components/           Design system (brand tokens from branding-assets/BRAND.md)
```

## Contributing

PRs welcome — especially from ISB / iVi folks. Keep changes consistent with [SPEC.md](SPEC.md)
(data contracts live in `src/lib/types.ts`). Ideas: Google OAuth, rich-text posts,
cohort sub-spaces, admin moderation tools.

## License

[MIT](LICENSE) © 2026 Prasanna Kasthurirangan and iVi Forum contributors.
Logos and trademarks of ISB / I-Venture @ ISB belong to their respective owners.
