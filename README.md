# Sismo · Hospitales

Free, open-source web app to **search, report, and community-verify** earthquake
hospital admissions across Caracas hospitals in Venezuela. It mirrors a public Google
Drive of volunteer-maintained lists every 30 minutes and lets anyone search for a person
or contribute a report — while keeping newly submitted ID-proof documents private to
coordinators.

- **Search** by name or cédula. The registry (names, cédula, status) is public.
- **Report** a person at a hospital — no login. Requires the person's ID proof + your contact.
- **Verify / dispute** any record — no login. Requires your own identification proof.
- **Coordinators** moderate: review proof, confirm records, merge duplicates.
- **Stats** dashboard per hospital, with a data-freshness indicator.

> The hospital registry is already-public data, republished here to help families and
> rescue teams. Only the *newly uploaded* ID-proof scans and reporter/verifier contact
> info are private (coordinator-only), enforced by Postgres row-level security.

## Stack (all free tiers)

- **Next.js** (App Router, TypeScript) on **Vercel**
- **Supabase** — Postgres + Auth + Storage + Row-Level Security
- **GitHub Actions** — 30-minute Google Drive sync (no Google API key required)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase + coordinator values
npm test                     # unit tests (Vitest)
npm run dev                  # http://localhost:3000
```

## Deploy (free)

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), [`supabase/migrations/0002_seed_hospitals.sql`](supabase/migrations/0002_seed_hospitals.sql), [`supabase/migrations/0003_acopio.sql`](supabase/migrations/0003_acopio.sql) (centros de acopio), [`supabase/migrations/0004_colectas.sql`](supabase/migrations/0004_colectas.sql) (colectas), [`supabase/migrations/0005_eur.sql`](supabase/migrations/0005_eur.sql) (EUR currency), then [`supabase/migrations/0006_ocr_images.sql`](supabase/migrations/0006_ocr_images.sql) (image OCR cache).
3. **Storage** → create a **private** bucket named `proofs` (or run `npx tsx scripts/setup-storage.ts` with env set).
4. **Authentication → Providers → Email** → turn **OFF "Confirm email"** so sign-ups are
   instant (email/password auth — no per-login emails, so email rate limits never bottleneck
   logins at scale). Keep `<site>/auth/callback` + `http://localhost:3000/auth/callback` in
   the redirect allowlist (used only if you ever re-enable email confirmation / password reset).
5. Copy the **Project URL**, **anon/publishable key**, and **service_role secret key**.

### 2. Vercel
1. Import the GitHub repo at [vercel.com](https://vercel.com) (free Hobby plan).
2. Set environment variables (from `.env.example`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `DRIVE_ROOT_FOLDER_ID`, `COORDINATOR_EMAILS`.
3. Deploy.

### 3. GitHub Actions (the 30-min sync)
In the repo: **Settings → Secrets and variables → Actions** → add:
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DRIVE_ROOT_FOLDER_ID`.
The [`drive-sync`](.github/workflows/sync.yml) workflow then runs every 30 minutes
(and can be triggered manually via **Actions → drive-sync → Run workflow**).

Run a sync locally any time with:

```bash
npm run sync
```

## How it works

- `lib/parser/` turns the messy Drive PDFs/Docs into structured records, anchoring on
  hospital names and scoring confidence (ambiguous rows go to a review queue).
- `scripts/sync-drive.ts` downloads the public folder, parses, upserts **idempotently**
  (human edits and coordinator-verified records are never overwritten), and flags
  cross-hospital duplicates.
- `records_public` is a column-curated view: the public sees the registry; proof scans
  and contact info are reachable only via the service role / coordinators.

## License

MIT — see [LICENSE](LICENSE).
