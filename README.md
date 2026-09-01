# GO Aikatsu — Admin Dashboard

Admin dashboard for a Group Order (GO) business purchasing Aikatsu products
from Mercari Japan, per the product's PRD. Covers order recap (Box → Batch →
Item → Customer), batch payment management, tax bill management (Tagihan
Pajak EMS), and Price Estimator configuration.

## Stack

- React 19 + TypeScript, built with Vite
- React Router (hash routing)
- Zustand (+ `persist`) for state — currently the only data layer
- Tailwind CSS v4

## Running locally

```bash
npm install
npm run dev
```

## Current data layer

The app runs entirely on the Zustand store in `src/store/useStore.ts`,
persisted to `localStorage`. There is no backend yet — item photos and
bukti transfer uploads are stored as base64 data URLs in the browser. This
is fine for demoing the workflows, but doesn't scale past a single device
or survive a cleared browser.

## Backend (scaffolded, not yet wired up)

`supabase/migrations/0001_init.sql` has a Postgres schema mirroring
`src/types.ts` (batches, items, batch_bills, tax_bills, estimator_config,
notifications), with Row Level Security policies so customers only ever
see their own rows and Admin GO has full access. `src/lib/supabaseClient.ts`
is a client stub — nothing in the app calls it yet.

To connect a real project:

1. Create a project at [supabase.com](https://supabase.com), run the
   migration (`supabase db push` or paste it into the SQL editor).
2. Create the `batch-photos` and `bukti-transfer` storage buckets (see the
   comment at the bottom of the migration file) and add matching storage
   policies.
3. Copy `.env.example` to `.env` and fill in your project URL/anon key.
4. Set up LINE Login per the Auth section below.
5. Swap the relevant `useStore.ts` actions to call Supabase instead of
   mutating local state — not done yet, since it touches every page.

## Auth (planned)

**LINE Login is the only sign-in method** — no email/password, no other
OAuth provider, for either dashboard. Both Admin GO and customers sign in
through the same LINE flow; which dashboard they land on is decided
afterward by `profiles.role`, not by a separate login form.

Why this works: LINE Login (v2.1) is OpenID Connect–compliant — it issues
a signed `id_token` carrying the user's stable LINE id (`sub`), display
name, and profile picture. Supabase Auth can accept that directly via
`supabase.auth.signInWithIdToken()` once LINE is registered as a custom
OIDC provider on the project (LINE Developers Console → a "LINE Login"
channel, Callback URL pointed at the Supabase Auth callback, Channel ID/
Secret entered into Supabase's Auth provider settings).

Consequences this has on the schema and app, worth keeping in mind:

- `profiles.line_user_id` stores the `sub` claim and is how a returning
  LINE user is matched back to their row; `full_name` / `avatar_url` are
  seeded from the LINE profile on first login and editable after.
- **No self-serve admin signup.** Every new LINE login defaults to
  `role = 'customer'` — there's no signal in a LINE login that says
  "this is Admin GO." Promoting an account to `role = 'admin'` is a
  manual step (flip the row directly, or a one-time allowlist of known
  LINE user IDs applied by a trigger) done outside the app.
- If a customer's phone number changes but their LINE account doesn't,
  nothing breaks — identity is the LINE account, not a phone/email.
- This also means: no password reset flow, no "forgot password" support
  ticket to design for — LINE handles all of that on its side.
