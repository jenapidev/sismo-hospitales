# Schema verification (run once Supabase is provisioned)

These are manual checks to run in the Supabase SQL editor / via the anon key
after applying `0001_init.sql` and `0002_seed_hospitals.sql`.

## Apply
- Paste `0001_init.sql` then `0002_seed_hospitals.sql` into the SQL editor, or
  `supabase db push` if using the CLI.
- Expect: 4 tables, 3 enums, 1 view, 6 hospital rows.

## RLS / privacy checks (use the ANON key, not service role)
The registry (incl. full cédula) is intentionally public; only uploaded ID-proof
scans and reporter/verifier contact are private to coordinators.
1. `select * from records_public;` → works; INCLUDES `cedula`, `notes`; has NO
   `person_id_proof_path` / `submitter_name` / `submitter_contact` columns.
2. `select * from records;` → returns **0 rows** (RLS blocks anon on base table, so
   the private submission columns are unreachable via the raw anon key).
3. `select * from verifications;` → returns **0 rows** (verifier proof/contact hidden).
4. `select * from hospitals;` → returns 6 rows (world-readable).
5. `select * from sync_runs;` → works (world-readable).

## Service-role checks
- Insert a `records` row with `source='public_report'` → succeeds.
- `records_public` reflects it (when `hidden=false`) with full cédula, but omits the
  proof path + submitter fields.

Record PASS/FAIL here when run:
- [ ] anon CAN read `records_public` (registry incl. full cédula)
- [ ] anon cannot read base `records` (proof/submitter columns unreachable)
- [ ] anon cannot read `verifications` (verifier proof/contact unreachable)
- [ ] `records_public` has no proof/submitter columns
- [ ] hospitals seeded (6)
