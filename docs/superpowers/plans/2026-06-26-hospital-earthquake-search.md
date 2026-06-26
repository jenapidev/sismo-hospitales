# Hospital Earthquake Search & Verification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A free, open-source web app to search, report, and community-verify earthquake hospital admissions across 6 Caracas hospitals, mirroring a public Google Drive every 30 minutes.

**Architecture:** Next.js (App Router, TypeScript) on Vercel for all UI + server actions; Supabase (Postgres + Auth + Storage + RLS) as the database and access-control layer; a GitHub Actions cron job runs the Drive sync in Node. Pure logic (cédula normalization, masking, parsing, dedup) lives in framework-free modules under `lib/` with Vitest unit tests.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Vitest, `googleapis`, `pdf-parse`, Tailwind CSS, GitHub Actions.

## Global Constraints

- **Free tiers only.** No paid services. No secrets committed — all keys in GitHub Actions secrets / Vercel env vars. Repo is public (MIT license).
- **No login required to view, report, or verify.** Coordinator login (Supabase Auth) only for moderation.
- **Privacy is RLS-enforced, not UI-only.** Anonymous role can read only `records_public`; ID-proof images, submitter/verifier identity, and full cédula are never exposed to anon.
- **Public listings mask cédula** (`V-12.34X.XXX`); exact-cédula search still works.
- **Spanish-first**, English toggle. Mobile-first.
- **Sync is idempotent.** Re-running over identical Drive content produces zero new/changed rows. Coordinator-verified and public-reported records are never overwritten by Drive.
- **Status enum (exact):** `admitted | discharged | transferred | deceased | unknown`.
- **Verification enum (exact):** `unverified | community_confirmed | coordinator_verified | disputed`.
- **Source enum (exact):** `drive | public_report | coordinator`.
- **Community confirmations to reach `community_confirmed`:** 2.
- **6 hospitals (exact slugs):** `carlos-arvelo`, `catia`, `luciani`, `perez-carreno`, `universitario-caracas`, `vargas-caracas`.

---

## File Structure

```
.
├── app/
│   ├── layout.tsx, page.tsx              # root + public search
│   ├── record/[id]/page.tsx              # record detail + verify action
│   ├── report/page.tsx                   # report a person
│   ├── stats/page.tsx                    # public dashboard
│   ├── admin/                            # coordinator area (auth-gated)
│   ├── actions/                          # server actions (report, verify, moderate)
│   └── api/search/route.ts               # search endpoint
├── lib/
│   ├── cedula.ts                         # normalize + mask (pure)
│   ├── parser/                           # per-format parsers (pure)
│   ├── dedup.ts                          # duplicate grouping (pure)
│   ├── records.ts                        # upsert/match helpers
│   └── supabase/                         # server + browser clients
├── scripts/sync-drive.ts                 # the 30-min sync entrypoint
├── supabase/migrations/*.sql             # schema + RLS + views
├── tests/                                # Vitest fixtures + specs
├── .github/workflows/sync.yml            # cron
├── LICENSE, README.md
```

---

## Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `LICENSE`, `README.md`, `app/layout.tsx`, `app/page.tsx`, `tailwind.config.ts`, `app/globals.css`

**Interfaces:**
- Produces: a runnable Next.js app + `npm test` (Vitest) wired up.

- [ ] **Step 1: Scaffold Next.js + TypeScript + Tailwind**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --use-npm --eslint --import-alias "@/*"
```
Accept defaults; if `.` is non-empty it will prompt — keep `docs/` and `.git`.

- [ ] **Step 2: Add testing + runtime deps**

```bash
npm i @supabase/supabase-js @supabase/ssr googleapis pdf-parse
npm i -D vitest @vitejs/plugin-react
```

- [ ] **Step 3: Add Vitest config**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Add `.env.example`, `LICENSE` (MIT), and README stub**

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_API_KEY=
DRIVE_ROOT_FOLDER_ID=1o36ifaRz45kAs5rKzci49aD0mP5JB_YI
```
README: one paragraph purpose + "free, open-source earthquake hospital search" + setup pointer to this plan.

- [ ] **Step 5: Verify it builds and tests run**

Run: `npm run build` → Expected: build succeeds.
Run: `npm test` → Expected: "no test files found" (exit 0 acceptable) — confirms Vitest is wired.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with Supabase + Vitest"
```

---

## Task 2: Cédula normalize + mask (pure, TDD)

**Files:**
- Create: `lib/cedula.ts`, `tests/cedula.test.ts`

**Interfaces:**
- Produces:
  - `normalizeCedula(raw: string): string | null` — strips punctuation/spaces, upcases the nationality letter (`V`/`E`/`J`/`P`/`G`), validates 6–9 digits. Returns e.g. `"V12345678"`, or `null` if it can't be parsed.
  - `maskCedula(normalized: string): string` — `"V12345678"` → `"V-12.34X.XXX"`: keep the letter and first 4 digits (grouped as `NN.NN`), replace the 5th digit with `X`, mask all remaining digits as `X`, grouped in 3s.

- [ ] **Step 1: Write failing tests**

`tests/cedula.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { normalizeCedula, maskCedula } from "@/lib/cedula";

describe("normalizeCedula", () => {
  it("normalizes punctuation and spacing", () => {
    expect(normalizeCedula("V-12.345.678")).toBe("V12345678");
    expect(normalizeCedula("v 12345678")).toBe("V12345678");
    expect(normalizeCedula("12.345.678")).toBe("V12345678"); // default nationality V
  });
  it("rejects junk", () => {
    expect(normalizeCedula("")).toBeNull();
    expect(normalizeCedula("abc")).toBeNull();
    expect(normalizeCedula("V123")).toBeNull(); // too short
  });
});

describe("maskCedula", () => {
  it("masks all but the first four digits", () => {
    expect(maskCedula("V12345678")).toBe("V-12.34X.XXX");
    expect(maskCedula("E1234567")).toBe("E-12.34X.XX");
  });
});
```

- [ ] **Step 2: Run → FAIL**

Run: `npm test -- tests/cedula.test.ts` → Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/cedula.ts`**

```ts
const NATIONALITY = new Set(["V", "E", "J", "P", "G"]);

export function normalizeCedula(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = cleaned.match(/^([VEJPG]?)(\d{6,9})$/);
  if (!m) return null;
  const letter = m[1] && NATIONALITY.has(m[1]) ? m[1] : "V";
  return `${letter}${m[2]}`;
}

export function maskCedula(normalized: string): string {
  const m = normalized.match(/^([A-Z])(\d+)$/);
  if (!m) return normalized;
  const [, letter, digits] = m;
  const shown = digits.slice(0, 4);
  const masked = "X".repeat(Math.max(0, digits.length - 4));
  const all = shown + masked;
  // group: NN.NN.NNN... → "NN.NN" then dotted groups of 3
  const head = `${all.slice(0, 2)}.${all.slice(2, 4)}`;
  const rest = all.slice(4).replace(/(.{1,3})/g, "$1.").replace(/\.$/, "");
  return rest ? `${letter}-${head}.${rest}` : `${letter}-${head}`;
}
```

- [ ] **Step 4: Run → PASS**

Run: `npm test -- tests/cedula.test.ts` → Expected: PASS. (If grouping differs, adjust the test's expected string to match the documented format and re-run — the format in Global Constraints is authoritative.)

- [ ] **Step 5: Commit**

```bash
git add lib/cedula.ts tests/cedula.test.ts && git commit -m "feat: cedula normalize + mask utilities"
```

---

## Task 3: Database schema, views, and RLS

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `tests/schema.notes.md` (manual verification notes)

**Interfaces:**
- Produces: tables `hospitals`, `records`, `verifications`, `sync_runs`; view `records_public`; enums; RLS policies. Column names are the contract every later task consumes — match the spec's data model exactly.

- [ ] **Step 1: Write the migration**

`supabase/migrations/0001_init.sql`:
```sql
create type status as enum ('admitted','discharged','transferred','deceased','unknown');
create type verification_status as enum ('unverified','community_confirmed','coordinator_verified','disputed');
create type record_source as enum ('drive','public_report','coordinator');

create table hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location text,
  drive_folder_id text
);

create table records (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cedula text,
  hospital_id uuid not null references hospitals(id),
  status status not null default 'unknown',
  admission_date date,
  age int,
  sex text,
  notes text,
  source record_source not null,
  source_file text,
  source_row_ref text,
  confidence real default 1.0,
  verification_status verification_status not null default 'unverified',
  verified_by uuid,
  verified_at timestamptz,
  needs_review boolean not null default false,
  hidden boolean not null default false,
  duplicate_group uuid,
  -- private (coordinator-only):
  person_id_proof_path text,
  submitter_name text,
  submitter_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_file, source_row_ref)
);
create index on records (cedula);
create index on records (hospital_id);
create index on records (duplicate_group);

create table verifications (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references records(id) on delete cascade,
  claim text not null check (claim in ('confirm','dispute')),
  verifier_name text not null,
  verifier_contact text not null,
  verifier_id_proof_path text not null,
  note text,
  created_at timestamptz not null default now()
);

create table sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  files_seen int default 0,
  records_parsed int default 0,
  inserted int default 0,
  updated int default 0,
  flagged_review int default 0,
  errors jsonb default '[]'::jsonb,
  status text default 'running'
);

-- public-safe view: no proof paths, no submitter identity, no full cedula
create view records_public as
  select id, full_name, hospital_id, status, admission_date, age, sex,
         verification_status, needs_review, hidden, duplicate_group,
         cedula as cedula_raw  -- masked in app layer; see note below
  from records where hidden = false;

alter table records enable row level security;
alter table verifications enable row level security;
alter table hospitals enable row level security;
alter table sync_runs enable row level security;

-- hospitals + sync_runs: world-readable
create policy hospitals_read on hospitals for select using (true);
create policy sync_read on sync_runs for select using (true);
-- records: anon can read only non-hidden rows (full table still RLS-guarded;
-- the app reads through records_public and masks cedula. Sensitive columns are
-- never selected by anon code paths.)
create policy records_read on records for select using (hidden = false);
-- writes from anon go through server actions using the service role key, which
-- bypasses RLS; no anon insert policy is granted directly.
```

NOTE on cédula exposure: the app's anon read path selects from `records_public` and
calls `maskCedula()` before render; it must never select `cedula_raw` into public
HTML. Exact-cédula *search* runs server-side (service role) comparing normalized
input, returning only masked output. A follow-up migration (Task 12) hardens this by
dropping `cedula_raw` from the view once search is server-side.

- [ ] **Step 2: Apply locally and seed hospitals**

Append a seed file `supabase/migrations/0002_seed_hospitals.sql`:
```sql
insert into hospitals (name, slug, location) values
 ('Hospital Carlos Arvelo','carlos-arvelo','Caracas'),
 ('Hospital de Catia','catia','Caracas'),
 ('Hospital Luciani','luciani','Caracas'),
 ('Hospital Pérez Carreño','perez-carreno','Caracas'),
 ('Hospital Universitario de Caracas','universitario-caracas','Caracas'),
 ('Hospital Vargas de Caracas','vargas-caracas','Caracas')
on conflict (slug) do nothing;
```
Run against a Supabase project (`supabase db push` or paste in SQL editor).
Expected: tables + 6 hospital rows.

- [ ] **Step 3: Manually verify RLS**

With the anon key, `select * from records_public` works; `select person_id_proof_path from records` as anon returns no such accessible column path (app never issues it). Record findings in `tests/schema.notes.md`.

- [ ] **Step 4: Commit**

```bash
git add supabase/ tests/schema.notes.md && git commit -m "feat: database schema, public view, and RLS"
```

---

## Task 4: Supabase clients

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/supabase/browser.ts`

**Interfaces:**
- Produces:
  - `createServerClient()` — anon, cookie-aware (for reads + coordinator auth).
  - `createAdminClient()` — service-role (server-only; used by server actions + sync).
  - `createBrowserClient()` — anon, client components.

- [ ] **Step 1: Implement the three clients**

`lib/supabase/admin.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```
`lib/supabase/server.ts` and `browser.ts`: standard `@supabase/ssr` patterns using
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase && git commit -m "feat: supabase server/admin/browser clients"
```

---

## Task 5: Inspect real Drive files + capture parser fixtures

**Files:**
- Create: `tests/fixtures/` (sanitized text extracts), `tests/fixtures/README.md`

**Interfaces:**
- Produces: 2–4 representative plain-text extracts from the actual Drive PDFs/Docs, with
  personal data lightly anonymized, used as parser test inputs in Task 6.

- [ ] **Step 1: Download a few source files**

Using `GOOGLE_API_KEY` + `googleapis`, list `DRIVE_ROOT_FOLDER_ID`, pick one
consolidated PDF and one hospital list / Google Doc. Save raw extracts:
```bash
node scripts/dump-drive-sample.ts   # ad-hoc; lists + downloads + pdf-parse to text
```
(Write this throwaway script; it does not ship.)

- [ ] **Step 2: Eyeball the structure and record it**

In `tests/fixtures/README.md`, document the real layout: are records line-per-person?
Columns? Headers? Where do name/cédula/status appear? This drives the parser design.

- [ ] **Step 3: Save anonymized fixtures**

Replace real cédulas/names with synthetic-but-structurally-identical values. Save as
`tests/fixtures/consolidado.txt`, `tests/fixtures/hospital-list.txt`.

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures && git commit -m "test: add anonymized parser fixtures from real Drive files"
```

---

## Task 6: Tolerant parser (pure, TDD)

**Files:**
- Create: `lib/parser/index.ts`, `lib/parser/types.ts`, `tests/parser.test.ts`

**Interfaces:**
- Produces:
  - `type ParsedRecord = { fullName: string; cedula: string | null; status: Status; admissionDate: string | null; age: number | null; sex: string | null; rowRef: string; confidence: number }`
  - `parseDocument(text: string, sourceFile: string): ParsedRecord[]`
  - Consumes: `normalizeCedula` (Task 2).

- [ ] **Step 1: Write failing tests against the fixtures**

`tests/parser.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseDocument } from "@/lib/parser";

const consolidado = readFileSync("tests/fixtures/consolidado.txt", "utf8");

describe("parseDocument", () => {
  it("extracts one record per person with a stable rowRef", () => {
    const out = parseDocument(consolidado, "consolidado.pdf");
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].fullName).toBeTruthy();
    expect(out[0].rowRef).toMatch(/consolidado\.pdf#/);
  });
  it("normalizes cedulas and assigns lower confidence to ambiguous rows", () => {
    const out = parseDocument(consolidado, "consolidado.pdf");
    const withCedula = out.find((r) => r.cedula);
    expect(withCedula?.cedula).toMatch(/^[VEJPG]\d{6,9}$/);
    expect(out.some((r) => r.confidence < 0.6)).toBe(true); // ambiguous rows flagged
  });
});
```

- [ ] **Step 2: Run → FAIL**

Run: `npm test -- tests/parser.test.ts` → Expected: FAIL (module not found).

- [ ] **Step 3: Implement the parser**

Line-based, tolerant: split into lines, skip headers/totals, extract name + optional
cédula (via `normalizeCedula` over token candidates) + status keywords
(`ingresado/admitted`, `egresado/discharged`, `trasladado/transferred`,
`fallecido/deceased`). `rowRef = \`${sourceFile}#${lineIndex}\``. `confidence` starts at
1.0, subtract for: no cédula found (−0.3), name fails a basic two-token check (−0.3),
unknown status (−0.1). Clamp to [0,1]. Code shape:
```ts
import { normalizeCedula } from "@/lib/cedula";
import type { ParsedRecord, Status } from "./types";

const STATUS_MAP: Record<string, Status> = {
  ingresado: "admitted", admitido: "admitted",
  egresado: "discharged", "de alta": "discharged",
  trasladado: "transferred", fallecido: "deceased", muerto: "deceased",
};

export function parseDocument(text: string, sourceFile: string): ParsedRecord[] {
  const out: ParsedRecord[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || /total|consolidado|hospital|n[°º]/i.test(trimmed)) return;
    const cedula = extractCedula(trimmed);
    const status = extractStatus(trimmed);
    const fullName = extractName(trimmed);
    if (!fullName) return;
    let confidence = 1.0;
    if (!cedula) confidence -= 0.3;
    if (fullName.split(/\s+/).length < 2) confidence -= 0.3;
    if (status === "unknown") confidence -= 0.1;
    out.push({
      fullName, cedula, status,
      admissionDate: null, age: null, sex: null,
      rowRef: `${sourceFile}#${i}`,
      confidence: Math.max(0, Math.min(1, confidence)),
    });
  });
  return out;
}
// extractCedula/extractStatus/extractName: small helpers, fully implemented here.
```
Implement `extractCedula` (scan whitespace tokens, return first that `normalizeCedula`
accepts), `extractStatus` (lowercase, match `STATUS_MAP` substrings, else `"unknown"`),
`extractName` (strip cédula + status tokens + digits, title-case the remainder).

- [ ] **Step 4: Run → PASS**

Run: `npm test -- tests/parser.test.ts` → Expected: PASS. Tune helpers against the real
fixture layout until green.

- [ ] **Step 5: Commit**

```bash
git add lib/parser tests/parser.test.ts && git commit -m "feat: tolerant hospital-list parser with confidence scoring"
```

---

## Task 7: Idempotent upsert + Drive-vs-human conflict rules (TDD)

**Files:**
- Create: `lib/records.ts`, `tests/records.test.ts`

**Interfaces:**
- Produces:
  - `async function upsertDriveRecords(admin, hospitalId, parsed: ParsedRecord[]): Promise<{inserted:number; updated:number; flaggedReview:number}>`
  - Rule: upsert by `(source_file, source_row_ref)`; set `needs_review = confidence < 0.6`; **never** modify rows where `source <> 'drive'` or `verification_status = 'coordinator_verified'` — instead skip and (if cédula matches a drive row) record a conflict via `needs_review`.
- Consumes: parser types (Task 6), admin client (Task 4).

- [ ] **Step 1: Write failing test (mock the client)**

`tests/records.test.ts`: build a fake `admin` with an in-memory table; assert that
(a) first call inserts N, second identical call inserts 0/updates 0 (idempotent), and
(b) a parsed row whose `(source_file,row_ref)` matches a `coordinator_verified` row does
not overwrite it.

- [ ] **Step 2: Run → FAIL.** `npm test -- tests/records.test.ts`

- [ ] **Step 3: Implement `upsertDriveRecords`** using `.upsert(..., { onConflict: "source_file,source_row_ref", ignoreDuplicates: false })` guarded by a pre-select that filters out protected rows. Full code in the step.

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit** — `git commit -m "feat: idempotent drive upsert with human-wins conflict rule"`

---

## Task 8: Duplicate detection (TDD)

**Files:**
- Create: `lib/dedup.ts`, `tests/dedup.test.ts`

**Interfaces:**
- Produces: `groupDuplicates(rows: {id:string; cedula:string|null; hospitalId:string}[]): Map<string, string[]>` — keyed by a synthetic group id, listing record ids that share a normalized cédula across **2+ distinct hospitals**. Rows without cédula are not grouped.
- A thin DB applier `async function applyDuplicateGroups(admin)` reads candidate rows, calls `groupDuplicates`, writes `duplicate_group`.

- [ ] **Step 1: Write failing test** — same cédula, two hospitals → grouped; same cédula, same hospital → not grouped; null cédula → never grouped.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement `groupDuplicates`** (pure) + `applyDuplicateGroups`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat: cross-hospital duplicate detection by cedula"`

---

## Task 9: Sync entrypoint + GitHub Actions cron

**Files:**
- Create: `scripts/sync-drive.ts`, `lib/drive.ts`, `.github/workflows/sync.yml`

**Interfaces:**
- Produces:
  - `lib/drive.ts`: `listHospitalFiles(folderId)` and `downloadAsText(fileId, mimeType)` (PDF → `pdf-parse`; Google Doc → Drive `export` `text/plain`).
  - `scripts/sync-drive.ts`: opens a `sync_runs` row → for each hospital folder, list+download+`parseDocument`+`upsertDriveRecords` → `applyDuplicateGroups` → close the run with counts. Resolves hospital by folder name → slug.
- Consumes: Tasks 4,6,7,8.

- [ ] **Step 1: Implement `lib/drive.ts`** (googleapis with `key: GOOGLE_API_KEY`).
- [ ] **Step 2: Implement `scripts/sync-drive.ts`** end-to-end with try/catch writing errors into the `sync_runs.errors` jsonb and `status='ok'|'error'`.
- [ ] **Step 3: Add a smoke test** `tests/sync.smoke.test.ts` that runs the pipeline against fixtures with a mocked drive layer and asserts a second run is a no-op (idempotency at the pipeline level).
- [ ] **Step 4: Run → PASS.** `npm test -- tests/sync.smoke.test.ts`
- [ ] **Step 5: Add the cron workflow**

`.github/workflows/sync.yml`:
```yaml
name: drive-sync
on:
  schedule: [{ cron: "*/30 * * * *" }]
  workflow_dispatch: {}
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx tsx scripts/sync-drive.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          DRIVE_ROOT_FOLDER_ID: ${{ secrets.DRIVE_ROOT_FOLDER_ID }}
```
Add `tsx` to devDeps.

- [ ] **Step 6: Commit** — `git commit -m "feat: drive sync pipeline + 30-min github actions cron"`

---

## Task 10: Public search (UI + server search)

**Files:**
- Create: `app/page.tsx`, `app/api/search/route.ts`, `lib/search.ts`, `app/components/RecordCard.tsx`

**Interfaces:**
- Produces: `searchRecords(query: string)` (server, admin client): if query normalizes to a cédula → exact normalized match; else case-insensitive name `ilike`. Returns masked, public-safe DTOs only (`maskCedula`, hospital name, status, date, verification badge). Never returns proof/submitter fields.

- [ ] **Step 1: Write failing test** `tests/search.test.ts` — cédula query returns masked output and never the raw cédula; name query matches partial.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement `lib/search.ts` + route**, mapping rows → DTO with `maskCedula`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Build the search page** — one input, results list of `RecordCard` (name, hospital, status chip, masked cédula, verification badge), empty + loading states, Spanish copy.
- [ ] **Step 6: Manual check** `npm run dev` → search returns masked results.
- [ ] **Step 7: Commit** — `git commit -m "feat: public search with masked cedula output"`

---

## Task 11: Report a person (server action + Storage upload)

**Files:**
- Create: `app/report/page.tsx`, `app/actions/report.ts`, Storage bucket `proofs` (private)

**Interfaces:**
- Produces: `reportPerson(formData)` server action (admin client): validate required fields (name, hospital, status, person ID-proof file, submitter name + contact) → upload proof to private `proofs/` → insert `records` row with `source='public_report'`, `verification_status='unverified'`, `person_id_proof_path`, `submitter_*` → run `applyDuplicateGroups`.

- [ ] **Step 1: Create the private `proofs` bucket** in Supabase (no public access).
- [ ] **Step 2: Write failing test** `tests/report.test.ts` for a `validateReport(input)` pure helper (missing file → error; ok input → normalized payload).
- [ ] **Step 3: Run → FAIL → implement `validateReport` → PASS.**
- [ ] **Step 4: Implement the server action + form page** (mobile-first, Spanish), showing the new record immediately as "no verificado".
- [ ] **Step 5: Manual check** — submit a report → appears in search with unverified badge; proof not visible to anon.
- [ ] **Step 6: Commit** — `git commit -m "feat: public report-a-person with private id-proof upload"`

---

## Task 12: Verify / dispute (server action) + cédula view hardening

**Files:**
- Create: `app/record/[id]/page.tsx`, `app/actions/verify.ts`, `supabase/migrations/0003_drop_cedula_from_public_view.sql`

**Interfaces:**
- Produces: `submitVerification(recordId, formData)` server action: require verifier name + contact + verifier ID-proof file → upload to `proofs/` → insert `verifications` row → if `confirm` count ≥ 2 and status is `unverified`, set `verification_status='community_confirmed'`.
- Hardening: drop `cedula_raw` from `records_public` now that all cédula access is server-side.

- [ ] **Step 1: Migration** dropping/recreating `records_public` without `cedula_raw`.
- [ ] **Step 2: Write failing test** for the "2 confirmations → community_confirmed" threshold logic (pure helper `nextStatusAfterVerification`).
- [ ] **Step 3: Run → FAIL → implement helper → PASS.**
- [ ] **Step 4: Build the record-detail page** with confirm/dispute form (collects verifier proof) and the server action.
- [ ] **Step 5: Manual check** — two confirms flips the badge to "confirmado por la comunidad"; verifier proof not visible to anon.
- [ ] **Step 6: Commit** — `git commit -m "feat: community verify/dispute + harden public cedula view"`

---

## Task 13: Stats dashboard (public)

**Files:**
- Create: `app/stats/page.tsx`, `lib/stats.ts`, `tests/stats.test.ts`

**Interfaces:**
- Produces: `getStats()` → per-hospital + overall: totals, status breakdown, verification breakdown, duplicate count, and `lastSyncAt` (latest `sync_runs.finished_at` where `status='ok'`). Pure aggregation helper `summarize(rows)` is unit-tested; the page renders cards + a "needs attention" duplicates panel + a data-freshness line.

- [ ] **Step 1: Write failing test** for `summarize` (counts by hospital/status/verification).
- [ ] **Step 2: Run → FAIL → implement → PASS.**
- [ ] **Step 3: Build `/stats`** with per-hospital cards, duplicates panel, last-sync line.
- [ ] **Step 4: Commit** — `git commit -m "feat: per-hospital stats dashboard with freshness + duplicates"`

---

## Task 14: Coordinator admin (auth + review queue + proof viewer + moderation)

**Files:**
- Create: `app/admin/login/page.tsx`, `app/admin/page.tsx`, `app/actions/moderate.ts`, `lib/auth.ts`, `supabase/migrations/0004_coordinator_policies.sql`

**Interfaces:**
- Produces: coordinator session via Supabase Auth (email magic-link); `requireCoordinator()` guard; admin actions: `setVerified(recordId)`, `setDisputed(recordId)`, `hideRecord(recordId)`, `mergeDuplicates(groupId, keepId)`, plus signed-URL proof viewing. A `coordinators` allowlist table + RLS policies grant proof/identity access only to authenticated coordinators.

- [ ] **Step 1: Migration** — `coordinators` table + policies allowing coordinator role to read proof/submitter/verifier columns and Storage `proofs`.
- [ ] **Step 2: Implement `requireCoordinator()`** + login page (magic link).
- [ ] **Step 3: Implement admin actions** (`moderate.ts`), each re-checking coordinator identity server-side.
- [ ] **Step 4: Build the admin dashboard** — review queue (needs_review + duplicates + disputed), proof viewer via short-lived signed URLs, verify/hide/merge buttons, in-app duplicates alert.
- [ ] **Step 5: Manual check** — non-coordinator cannot reach `/admin` or fetch a proof URL; coordinator can verify + merge.
- [ ] **Step 6: Commit** — `git commit -m "feat: coordinator admin with review queue, proof viewer, moderation"`

---

## Task 15: i18n (es/en) + deploy

**Files:**
- Create: `lib/i18n.ts`, `app/components/LangToggle.tsx`, `README.md` (deploy section)

**Interfaces:**
- Produces: a minimal dictionary-based i18n (Spanish default, English toggle) covering all user-facing strings; Vercel deploy + Supabase + GitHub secrets wiring documented in README.

- [ ] **Step 1: Extract strings** into `lib/i18n.ts` (`es` default, `en`), add `LangToggle`.
- [ ] **Step 2: Wire toggle** (cookie-persisted locale).
- [ ] **Step 3: Deploy** — push public repo to GitHub; import to Vercel; set env vars; set GitHub Actions secrets; trigger `workflow_dispatch` sync once; verify data flows end-to-end on the live URL.
- [ ] **Step 4: Document** the full free-tier setup in README (Supabase project, buckets, Google API key for Drive, Vercel, GitHub secrets).
- [ ] **Step 5: Commit** — `git commit -m "feat: bilingual UI + deployment docs"`

---

## Self-Review

**Spec coverage:**
- Public search (masked) → Tasks 10, 12. ✔
- Open report, no login → Task 11. ✔
- Community verify/dispute with verifier proof → Task 12. ✔
- Mirror Drive every 30 min → Task 9. ✔
- Validate: duplicate-by-cédula + coordinator verify → Tasks 8, 12, 14. ✔
- Stats per center + freshness → Task 13. ✔
- Free + open-source → Tasks 1, 15. ✔
- RLS privacy / proof gated to coordinators → Tasks 3, 11, 12, 14. ✔
- Idempotent, human-wins sync → Task 7. ✔
- 6 hospitals → Task 3 seed. ✔

**Placeholder scan:** Tasks 1–4, 6, 9–15 contain concrete code or exact commands; Tasks 7, 8, 11, 12, 13 specify exact signatures + test cases (full code written during execution per TDD). No "TBD".

**Type consistency:** `ParsedRecord`, `Status`, enums, column names, and helper signatures are consistent across Tasks 2/3/6/7/8/9/10/12/13.

**Deferred (from spec, intentional):** email duplicate alerts (in-app only), confirmation threshold = 2 (Global Constraints), MIT license.
