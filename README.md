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
4. Swap the relevant `useStore.ts` actions to call Supabase instead of
   mutating local state — not done yet, since it touches every page.
