# GlowSis

GlowSis - help you make the beauty choice with confidence

A real, deployable marketplace site for beauty treatments in the US,
starting with clinic onboarding — the production replacement for the Muse
prototype. One page only for now: clinics apply to be listed. No consumer
search, no demo clinic pages, no booking inbox.

**Positioning:** free to list at launch, no markup, price parity — the price
a patient sees on GlowSis is the price they pay in the clinic. Discounts
may go lower only. WeChat contact: `brandy_piao`.

The site is trilingual (English / 中文 / 한국어) with a persisted header
toggle. Clinic names, addresses, and prices are never translated — only UI
copy is.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Postgres (`pg`) when `DATABASE_URL` is set; local JSON file store under
  `.data/` when it is not — **local dev only, never production**
- API routes: `POST /api/applications`, `GET /api/applications` (admin),
  `PATCH /api/applications/[id]`, `DELETE /api/applications/[id]`
- Admin page at `/admin`, protected by `ADMIN_PASSWORD`

No fake clinics, no fake reviews, no fake ratings, no fake patient photos,
and no seeded demo submissions.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in values (see below)
npm run dev                  # http://localhost:3000
```

Local dev with no env vars set uses the JSON file store (`.data/applications.json`,
git-ignored). Submit an application on the home page, then open
http://localhost:3000/admin to see it and change its status.

## Environment variables

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Production: yes. Local dev: no | Postgres connection string. When set, applications are stored in Postgres (schema in `db/schema.sql`, auto-created on first use). When unset, the app falls back to the local JSON file store — dev only. |
| `ADMIN_PASSWORD` | Production: yes. Local dev: no | Password for `/admin` and the admin API endpoints (`x-admin-password` header). If unset, `/admin` is open and shows a visible warning — do not share the site in that state. |

## Deploy to Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In Vercel: **Add New → Project → Import** the repo. Framework preset:
   Next.js. Build command `npm run build`, output directory is automatic.
3. Set environment variables in **Project → Settings → Environment Variables**:
   `ADMIN_PASSWORD` (choose a strong password) and `DATABASE_URL` (next step).
4. Deploy. Every push to the default branch redeploys.

## Add Vercel Postgres and set DATABASE_URL

1. In Vercel: **Storage → Create Database → Postgres** (choose the same
   project and region as the app).
2. Vercel offers to connect it to the project — accept. It sets
   `DATABASE_URL` (plus `POSTGRES_URL` etc.) on the project automatically.
   If it does not, copy the connection string from the database's
   **.env.local** tab into the project's environment variables as
   `DATABASE_URL` and redeploy.
3. The app creates the `applications` and `price_rows` tables on first use
   (`lib/store.ts`, `ensurePostgresSchema`). To create them yourself instead,
   run the SQL in `db/schema.sql` against the database (Vercel dashboard →
   Storage → your database → Query tab, paste and run).
4. Verify after deploy: submit a test application on the live site, check it
   appears at `/admin`, change its status to `live`, then delete it.

## How the pieces fit

- `app/page.tsx` — the whole public site: hero, stats, support package,
  4 steps, price-parity section, Apply form, "Talk to us first" WeChat
  section, FAQ, footer. Client component (language toggle + form state).
- `lib/i18n.ts` — all EN / 中文 / 한국어 copy. `WECHAT_ID = "brandy_piao"`.
- `lib/types.ts` — application, price-row, status, and pricing-model types.
- `lib/store.ts` — Postgres ↔ JSON-file storage, plus shared validation.
- `lib/auth.ts` — the `ADMIN_PASSWORD` check.
- `app/api/applications/route.ts` — `POST` (public submit) and `GET` (admin list).
- `app/api/applications/[id]/route.ts` — `PATCH` (change status) and `DELETE`.
- `app/admin/page.tsx` — lists submissions newest first with price rows;
  change status (Submitted → Under review → Live) or delete.
- `db/schema.sql` — canonical Postgres schema.

## Notes / not legal advice

The licensing checkbox confirms a licensed medical facility / licensed
professionals; the license copy itself is requested by email during review
and is never uploaded in the form. Price parity (no markup, no % of treatment
price) is a product rule; get a New York healthcare lawyer's review before
taking any cut of medical fees.


Note: the code moved to the BrandyPiao1997/glow-sis repo on Nov 25, 2026 after the iworktolive GitHub account was suspended.
