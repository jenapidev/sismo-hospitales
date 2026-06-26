-- Schema for Sismo · Hospitales
-- Privacy model:
--   This is a public disaster-response service. The hospital registry (names,
--   cédulas, ages, status, ward) is ALREADY public data and is published here in
--   full so families and rescue teams can search and confirm identity.
--   * Anonymous users read the registry through the `records_public` VIEW, which
--     exposes the registry fields (including full cédula) but EXCLUDES the newly
--     submitted, sensitive fields: uploaded ID-proof scan paths and the
--     reporter/verifier contact info.
--   * The base `records`/`verifications` tables have RLS enabled with no anon
--     SELECT policy, so those sensitive submission fields are never reachable via
--     the raw anon key — only coordinators (and server-side service role) see them.
--   * Server actions, search, sync, and the coordinator admin use the service-role
--     key, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type status as enum ('admitted','discharged','transferred','deceased','unknown');
create type verification_status as enum ('unverified','community_confirmed','coordinator_verified','disputed');
create type record_source as enum ('drive','public_report','coordinator');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
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
  -- provenance
  source record_source not null,
  source_file text,
  source_row_ref text,
  confidence real not null default 1.0,
  -- verification
  verification_status verification_status not null default 'unverified',
  verified_by uuid,
  verified_at timestamptz,
  -- moderation
  needs_review boolean not null default false,
  hidden boolean not null default false,
  duplicate_group uuid,
  -- private (coordinator-only; never exposed by records_public)
  person_id_proof_path text,
  submitter_name text,
  submitter_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_file, source_row_ref)
);
create index records_cedula_idx on records (cedula);
create index records_hospital_idx on records (hospital_id);
create index records_duplicate_group_idx on records (duplicate_group);

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
create index verifications_record_idx on verifications (record_id);

create table sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  files_seen int not null default 0,
  records_parsed int not null default 0,
  inserted int not null default 0,
  updated int not null default 0,
  flagged_review int not null default 0,
  errors jsonb not null default '[]'::jsonb,
  status text not null default 'running'
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger records_set_updated_at
  before update on records
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Public registry view. Exposes the already-public registry fields INCLUDING
-- full cédula and ward notes. EXCLUDES only the newly submitted sensitive fields:
-- person_id_proof_path, submitter_name, submitter_contact (coordinator-only).
-- ---------------------------------------------------------------------------
create view records_public as
  select
    id,
    full_name,
    cedula,
    hospital_id,
    status,
    admission_date,
    age,
    sex,
    notes,
    source,
    verification_status,
    needs_review,
    duplicate_group,
    created_at,
    updated_at
  from records
  where hidden = false;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table records enable row level security;
alter table verifications enable row level security;
alter table hospitals enable row level security;
alter table sync_runs enable row level security;

-- hospitals + sync_runs are world-readable (non-sensitive)
create policy hospitals_read on hospitals for select using (true);
create policy sync_runs_read on sync_runs for select using (true);

-- records + verifications: NO anon policies => anonymous role reads nothing
-- from the base tables. Public reads happen via records_public; sensitive reads
-- and all writes happen server-side via the service-role key.

-- ---------------------------------------------------------------------------
-- Grants: expose only the safe view + the public tables to the anon role.
-- ---------------------------------------------------------------------------
grant select on records_public to anon, authenticated;
revoke all on records from anon;            -- belt-and-suspenders over RLS
revoke all on verifications from anon;
