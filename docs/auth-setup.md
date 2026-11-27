# GlowSis sign-in setup (Google + Apple)

The app ships with Google and Apple sign-in buttons (Supabase OAuth) on the
AI chat (`/ai`), the profile page (`/profile`), and the onboarding flow.
The buttons are built and the callback (`/auth/callback`) is wired — but
**sign-in will not work until the owner completes the steps below**. Until
then the buttons show a clear "sign-in isn't set up yet" state instead of
crashing.

## AI chat (Groq + Gemini)

The AI tab is backed by two providers through a server-side route,
`app/api/ai-chat/route.ts`, tried in order: Groq first
(`openai/gpt-oss-120b`, fast and free), then Gemini (model
`gemini-3.5-flash` first, `gemini-3.8-flash` as the fallback). The keys
never reach the browser. Without either key the chat falls back to
scripted keyword replies.

Groq setup (free, no credit card):

1. Go to the Groq console (https://console.groq.com) and sign up.
2. **API Keys → Create API Key** (free plan: 1,000 requests and 200,000
   tokens a day per model).
3. In Vercel → glow-sis → Settings → Environment Variables, add
   `GROQ_API_KEY` = the key, for Production + Preview, then redeploy.

Gemini setup:

1. Go to Google AI Studio (https://aistudio.google.com) and sign in with
   the Google account used for the project (brandypiao2021@gmail.com).
2. **Get API key → Create API key** (free tier; no billing needed to start).
3. In Vercel → glow-sis → Settings → Environment Variables, add
   `GEMINI_API_KEY` = the key, for Production + Preview, then redeploy.
4. Test: ask the AI tab "what is botox" — it should answer with real
   clinic prices, not the "I'm still learning" fallback.

Notes: the free tiers have daily request limits, so the chat falls back to
the next provider, then to scripted replies, when a key is rate-limited
or a call fails. Answers are grounded in real clinic prices from
`data/seed-clinics.json` (the route only quotes those facts, never
invents prices) and never diagnose or recommend a treatment. Groq sits
behind Cloudflare, which blocks bot-like User-Agents (HTTP 403 error
code 1010), so the route sends a plain `User-Agent: GlowSis/1.0`.

Order of work: **Google first (free), Apple once the $99/year Apple
Developer Program enrollment clears** — a free Apple account cannot create
the Services ID or signing key that Sign in with Apple needs.

## 1. Supabase — get the two env vars

Supabase project: `hfuthtigosrqjdeyvdys` (already connected to the Vercel
project for the clinic applications database).

1. Open the Supabase dashboard → this project → **Settings → API**.
2. Copy the **Project URL** and the **anon / public key**.
3. In Vercel → glow-sis project → **Settings → Environment Variables**,
   add (Production **and** Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
     (`https://hfuthtigosrqjdeyvdys.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key
4. Redeploy (or wait for the next push) so the values take effect.

## 2. Supabase — allow the callback URL

Supabase dashboard → **Authentication → URL Configuration → Redirect URLs**,
add:

- `https://glow-sis.vercel.app/auth/callback` (production)
- `http://localhost:3000/auth/callback` (local dev, optional)

## 3. Google sign-in (free — do this first)

1. Google Cloud Console → create/select a project → **APIs & Services →
   OAuth consent screen** → set up (External, app name `GlowSis`).
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → Application type **Web application**.
3. Under **Authorized redirect URIs** add:
   `https://hfuthtigosrqjdeyvdys.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret**.
5. Supabase dashboard → **Authentication → Providers → Google** → enable,
   paste the Client ID + Client Secret, save.

## 4. Apple sign-in (needs the paid $99/year Apple Developer Program)

1. Enroll in the **Apple Developer Program** ($99/year) and wait for
   enrollment to clear.
2. Apple Developer → **Certificates, Identifiers & Profiles → Identifiers** →
   create a **Services ID** with **Sign in with Apple** enabled:
   - Domains: `hfuthtigosrqjdeyvdys.supabase.co`
   - Return URLs: `https://hfuthtigosrqjdeyvdys.supabase.co/auth/v1/callback`
3. **Certificates, Identifiers & Profiles → Keys** → create a key with
   **Sign in with Apple** enabled, configure it against the Services ID,
   and **download the `.p8` file** (it can only be downloaded once).
4. Note the **Team ID** (Membership details) and the **Key ID** (the key's
   detail page).
5. Supabase dashboard → **Authentication → Providers → Apple** → enable and
   fill in: Service ID, Team ID, Key ID, and the private key (contents of
   the `.p8` file), save.

Note: once the app is distributed on the App Store, Apple requires Sign in
with Apple alongside any other social login — the membership also covers
that.

## 5. Verify

1. Open the live site, tap **AI**, choose **Continue with Google** (or Apple
   once enabled) → you should land back on the app signed in.
2. Check `/profile` — it should show your email.
3. The skin profile (concerns, city, budget, skin report) is saved to
   `localStorage` first; when signed in it is also backed up to the
   `profiles` table in the same Postgres database (created automatically
   by `lib/store.ts` on first save — no manual SQL needed).

## Still to do (later phases)

- **Perfect Corp skin analysis API** — no credentials yet. The skin test
  flow is built end-to-end (capture → analyzing → report → chat context),
  but `lib/skin-analysis.ts` `analyzeSkin()` is a clearly-marked stub
  returning a labeled sample report. To wire the real API, get credentials
  at https://yce.perfectcorp.com/id/ai-api/products/skin-analysis-api and
  replace the stub body (see the TODO in that file).
- **WeChat login** — not a built-in Supabase provider; needs a WeChat Open
  Platform account + approval. Planned later.
