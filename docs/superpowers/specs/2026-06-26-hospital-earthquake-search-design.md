# Hospital Earthquake Admissions — Search & Community Verification

**Date:** 2026-06-26
**Status:** Design approved (pending spec review)
**Working title:** Sismo · Hospitales (Venezuela earthquake response)

## Purpose

After the Venezuela earthquakes, volunteers maintain lists of admitted/injured people
across Caracas hospitals in a shared Google Drive (PDFs + Google Docs, per-hospital
folders). Families need to find their people; the data needs validating and
de-duplicating. This app makes that data **searchable, contributable, and
community-verifiable**, while keeping sensitive identity documents out of public reach.

Source Drive (public):
`https://drive.google.com/drive/folders/1o36ifaRz45kAs5rKzci49aD0mP5JB_YI`
Contains per-hospital folders for 6 centers (Carlos Arvelo, Catia, Luciani, Pérez
Carreño, Universitario de Caracas, Vargas de Caracas) plus consolidated admission PDFs
and Google Docs ("Ingresos por sismo en Hospitales", "Listas de personas en múltiples
hospitales").

## Goals

1. **Public search** — anyone, no login, searches by name or cédula and finds which
   hospital a person is in and their status.
2. **Open contribution** — anyone, no login, can report a person at a center.
3. **Community cross-verification** — anyone can verify/dispute a record; accountability
   comes from attaching identification proof to the *action*, not from an account.
4. **Mirror the Drive** — pull the Drive files every 30 minutes and merge them in.
5. **Validate** — auto-detect the same cédula reported at two centers and alert; let
   coordinators mark records confirmed.
6. **Stats** — per-clinical-center dashboard.
7. **Free hosting** and **open-source** code.

## Non-goals

- Not replacing hospital information systems.
- Not a medical records system; only admission/location/status for finding people.
- No payments, no messaging between users in v1.

## Architecture

```
Google Drive (volunteers maintain)            Public (no login)          Coordinators
        │ every 30 min                          │ report / verify          │ moderate
        ▼                                        ▼                          ▼
 GitHub Actions cron ──► parse/normalize ──►        Supabase (Postgres + Auth + Storage)
                                                       │   ▲          ▲
                                          public view  │   │ writes   │ coordinator (full + proof)
                                          (safe fields)▼   │          │
                                              Web app on Vercel (Next.js)
                                   /  (search) · /report · /record/[id] · /stats · /admin
```

- **Supabase (free tier):** Postgres database, Auth (coordinators only), Storage
  (private bucket for ID-proof images), Row-Level Security enforcing the public/coordinator
  split.
- **Vercel (free tier):** Next.js app — public pages + coordinator admin + server actions/API.
- **GitHub Actions (free):** scheduled Drive sync running in a full Node environment where
  PDF/Doc parsing libraries work properly.
- **Public GitHub repo**, permissive license (MIT). No secrets in the repo; all keys live
  in GitHub Actions secrets and Vercel env vars.

### Why this stack
Free across all tiers; gives a real database with enforced access control (RLS); and runs
the heavy/messy PDF parsing in a normal Node environment rather than a constrained
serverless worker.

## Data model

**`hospitals`**
- `id`, `name`, `slug`, `location`, `drive_folder_id`, `created_at`

**`records`** — one per reported person
- `id`
- `full_name`
- `cedula` (nullable; normalized, e.g. `V12345678`)
- `hospital_id` → hospitals
- `status` — enum: `admitted` | `discharged` | `transferred` | `deceased` | `unknown`
- `admission_date`, `age`, `sex`, `notes`
- Provenance: `source` (`drive` | `public_report` | `coordinator`), `source_file`,
  `source_row_ref`, `confidence` (0–1)
- Verification: `verification_status` — `unverified` | `community_confirmed` |
  `coordinator_verified` | `disputed`; `verified_by`, `verified_at`
- Moderation: `needs_review` (bool), `hidden` (bool, for abuse), `duplicate_group` (nullable)
- Private (coordinator-only): `person_id_proof_path` (Storage), `submitter_name`,
  `submitter_contact`
- `created_at`, `updated_at`

**`verifications`** — one per community verification action (coordinator-viewable only)
- `id`, `record_id` → records
- `claim` — `confirm` | `dispute`
- `verifier_name`, `verifier_contact`, `verifier_id_proof_path` (Storage)
- `note`, `created_at`

**`sync_runs`** — one per 30-min sync
- `id`, `started_at`, `finished_at`, `files_seen`, `records_parsed`, `inserted`,
  `updated`, `flagged_review`, `errors` (jsonb), `status`

**Public view `records_public`** exposes only safe fields: `full_name`, `hospital`,
`status`, `admission_date`, masked cédula, `verification_status`, community confirm/dispute
counts. It never exposes proof paths, submitter/verifier identity, or full cédula.

### Cédula handling
- Stored normalized for matching/dedup.
- **Public listings show it masked** (`V-12.34X.XXX`).
- **Search by full cédula works** (exact-match lookup) so a family can confirm "is
  V-12345678 here?" without us broadcasting full cédulas in result lists.

## Sync + parsing pipeline (the hard part)

GitHub Actions cron, every 30 min:
1. List each hospital folder via Google Drive API (public folder + API key).
2. Download PDFs; export Google Docs to text.
3. **Tolerant parser** extracts rows → `{full_name, cedula?, status?, ...}` with a
   `confidence` score. Parsers are per-source-format and built against real file fixtures.
4. Upsert into `records` keyed by `(source_file + source_row_ref)` so re-runs are
   **idempotent** (running twice changes nothing).
5. Rules:
   - Low-confidence / unparseable rows → `needs_review = true`, **never silently dropped**.
   - **Manual (`coordinator`) and `coordinator_verified` records win** over Drive: if the
     Drive later disagrees, raise a conflict for review rather than overwriting.
   - Public reports are never overwritten by Drive; they're matched/linked by cédula.
6. Log the run in `sync_runs`.

Implementation note: inspect the actual Drive files first and capture representative
samples as parser test fixtures before writing the parser.

## Verification & moderation flow

- **Report a person** (public, no login): form with name, hospital, status, optional
  cédula, **person's ID proof (image/PDF, required)**, **submitter name + contact
  (required)**. Saved immediately as `unverified` and visible in search with an
  "unverified" badge. Proof + submitter contact stored privately.
- **Verify/dispute** (public, no login): on a record, submit `confirm`/`dispute` with a
  note and **your own identification proof (required)**. Creates a `verifications` row.
  Enough confirmations move the record to `community_confirmed`.
- **Coordinator** (login): reviews proof images, sets `coordinator_verified` or
  `disputed`, edits/merges records, hides abuse, resolves duplicates and Drive conflicts.

## Duplicate detection ("reported at two sites")

- On every insert/update and every sync, detect cédulas (or strong name+age matches when
  cédula absent) appearing under **more than one hospital**.
- Group them via `duplicate_group`; surface in:
  - a **public "needs attention"** panel (these are real people possibly double-counted), and
  - the **coordinator review queue** with an **in-app dashboard alert**.
- Coordinators resolve by merging or confirming a transfer.

## Stats dashboard (`/stats`, public)

Per hospital and overall:
- total people, breakdown by status,
- admissions over time,
- counts: unverified / community-confirmed / coordinator-verified / disputed,
- duplicates flagged,
- **last successful sync time** (data-freshness indicator from `sync_runs`).

## Front-end

Spanish-first, English toggle. Mobile-first (families will use phones).
- `/` — single search box (name or cédula) → results (masked cédula, hospital, status,
  date, verification badge).
- `/record/[id]` — record detail + "confirm/dispute" action.
- `/report` — report a person.
- `/stats` — dashboard.
- `/admin` — coordinator login + review queue + edit/merge + proof viewer.

## Security & privacy

- RLS: anon role can `select` only `records_public` and insert into `records`/`verifications`
  via constrained server actions; cannot read proof paths, submitter/verifier identity, or
  Storage objects. Coordinator role can read/manage everything.
- ID-proof images in a **private Supabase Storage bucket**; coordinators access via
  short-lived signed URLs.
- Public repo ⇒ zero secrets in code; keys in GitHub/Vercel secrets.
- **Policy caveat (owner's call, not the app's):** publishing victims' names/status online
  has real consent and safety implications. The app provides masking, private proof, and
  moderation; a responsible person must own the decision to operate it.

## Testing

- **Parser unit tests** against fixtures captured from the real Drive PDFs/Docs.
- **Sync idempotency test**: run sync twice over the same fixtures → no new/changed rows.
- **Dedup test**: same cédula at two hospitals → one `duplicate_group`, surfaced.
- **RLS tests**: anon cannot read proof/submitter/verifier fields or Storage objects.
- **Masking test**: `records_public` never emits a full cédula.

## Open questions / deferred

- Email notifications for duplicates (deferred; in-app alert in v1).
- Exact threshold of community confirmations → `community_confirmed` (start: 2).
- License choice (default MIT) — confirm during setup.
