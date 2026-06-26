# Schema verification (run once Supabase is provisioned)

These are manual checks to run in the Supabase SQL editor / via the anon key
after applying `0001_init.sql` and `0002_seed_hospitals.sql`.

## Apply
- Paste `0001_init.sql` then `0002_seed_hospitals.sql` into the SQL editor, or
  `supabase db push` if using the CLI.
- Expect: 4 tables, 3 enums, 1 view, 6 hospital rows.

## RLS / privacy checks (use the ANON key, not service role)
1. `select * from records_public;` → works (returns rows, no cédula column).
2. `select * from records;` → returns **0 rows** (RLS blocks anon on base table).
3. `select person_id_proof_path from records;` → permission denied / 0 rows.
4. `select * from verifications;` → returns **0 rows**.
5. `select * from hospitals;` → returns 6 rows (world-readable).
6. `select * from sync_runs;` → works (world-readable).

## Service-role checks
- Insert a `records` row with `source='public_report'` → succeeds.
- `records_public` reflects it (when `hidden=false`) and omits cédula/proof/submitter.

Record PASS/FAIL here when run:
- [ ] anon cannot read base `records`
- [ ] anon cannot read `verifications`
- [ ] `records_public` exposes no cédula/proof/submitter columns
- [ ] hospitals seeded (6)
