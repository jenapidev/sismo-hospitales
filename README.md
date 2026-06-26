# Sismo · Hospitales

Free, open-source web app to **search, report, and community-verify** earthquake
hospital admissions across Caracas hospitals in Venezuela. It mirrors a public Google
Drive of volunteer-maintained lists every 30 minutes and lets anyone search for a person
or contribute a report — while keeping sensitive identity documents private to
coordinators.

- **Search** by name or cédula (cédula masked in public listings).
- **Report** a person at a hospital — no login. Requires the person's ID proof + your contact.
- **Verify / dispute** any record — no login. Requires your own identification proof.
- **Coordinators** moderate: review proof, confirm records, merge duplicates.
- **Stats** dashboard per hospital, with data-freshness indicator.

## Stack (all free tiers)

- **Next.js** (App Router, TypeScript) on **Vercel**
- **Supabase** — Postgres + Auth + Storage + Row-Level Security
- **GitHub Actions** — 30-minute Google Drive sync

## Status

Under active development. See the design spec and implementation plan in
[`docs/superpowers/`](docs/superpowers/).

## Development

```bash
npm install
npm test        # unit tests (Vitest)
npm run dev     # local dev server
```

Copy `.env.example` to `.env.local` and fill in Supabase + Google credentials.
Full deployment instructions: see Task 15 in the implementation plan.

## License

MIT — see [LICENSE](LICENSE).
