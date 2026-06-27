-- Centros de acopio (relief collection centers). All data is public.
-- Managers authenticate by email; a center is owned by owner_user_id; only the
-- owner or a coordinator edits it (enforced in server actions). Anon may read
-- non-hidden centers and all items.

create table acopio_centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  aid_destination text,                 -- "Destino de Ayuda": where received aid goes
  manager_name text not null,
  manager_cedula text,
  org_name text,
  org_id text,
  owner_user_id uuid,                   -- auth.users id of the managing user
  verification_status verification_status not null default 'unverified',
  verified_by uuid,
  verified_at timestamptz,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One center per name (case-insensitive) — "register only if it doesn't exist".
create unique index acopio_centers_name_uniq on acopio_centers (lower(name));

create table acopio_items (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references acopio_centers(id) on delete cascade,
  kind text not null check (kind in ('have','need')),
  name text not null,
  category text,
  quantity numeric,
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index acopio_items_center_idx on acopio_items (center_id);

create trigger acopio_centers_set_updated_at
  before update on acopio_centers
  for each row execute function set_updated_at();
create trigger acopio_items_set_updated_at
  before update on acopio_items
  for each row execute function set_updated_at();

alter table acopio_centers enable row level security;
alter table acopio_items enable row level security;

-- Public reads (writes go through service-role server actions after auth checks).
create policy acopio_centers_read on acopio_centers for select using (hidden = false);
create policy acopio_items_read on acopio_items for select using (true);
