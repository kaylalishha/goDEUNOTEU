# GO DEUNOTEU — Customer Dashboard

Customer-facing site, kept separate from the admin dashboard (repo root).
It shares the backend contract in `../supabase/` but has its own
`package.json`, build and deploy.

## Run

```bash
cd customer
npm install
npm run dev
```

## Routes

| Path | What |
| --- | --- |
| `/id` | Landing page (Home tab) |
| `/id?tab=order` | Order menu: Bayar Batch, Kalkulator Harga |
| `/id?tab=tagihan` | Tagihan menu + "Posisi barang kamu" tracker |
| `/id?tab=profile` | LINE login card (not wired yet) |
| `/id/order`, `/id/calculator`, `/id/ems-tax` | Placeholders until those pages are built |

## Filling in content

All copy, numbers, links and media slots are in `src/content.ts`; anything
marked `TODO` or in `[brackets]` is a placeholder. Every photo renders as a
labelled placeholder box until you set its `*Src` field.

## Deploy (Vercel)

Create a separate Vercel project with **Root Directory = `customer`**.
`vercel.json` rewrites all paths to `index.html` for client-side routing.
