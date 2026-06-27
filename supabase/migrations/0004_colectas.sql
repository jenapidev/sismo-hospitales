-- Colectas (donation drives). Colectas + accounts are public; donation proof images
-- are private (owner/coordinator only). Donations are read publicly via a view that
-- omits proof_path. Owners manage via email login; writes go through server actions.

create table colectas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  goal_amount numeric,
  currency text not null default 'Bs' check (currency in ('Bs','USD')),
  admin_name text not null,
  admin_cedula text not null,
  admin_email text not null,
  owner_user_id uuid,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table colecta_accounts (
  id uuid primary key default gen_random_uuid(),
  colecta_id uuid not null references colectas(id) on delete cascade,
  method text not null check (method in ('pago_movil','bizum','zelle')),
  phone text,        -- pago_movil
  bank_entity text,  -- pago_movil
  cedula text,       -- pago_movil
  email text,        -- bizum / zelle
  owner_name text,   -- bizum / zelle
  created_at timestamptz not null default now()
);
create index colecta_accounts_colecta_idx on colecta_accounts (colecta_id);

create table donaciones (
  id uuid primary key default gen_random_uuid(),
  colecta_id uuid not null references colectas(id) on delete cascade,
  account_id uuid references colecta_accounts(id) on delete set null,
  amount numeric,
  currency text not null default 'Bs' check (currency in ('Bs','USD')),
  donor_name text,
  proof_path text not null,   -- private (coordinator/owner only)
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index donaciones_colecta_idx on donaciones (colecta_id);

create trigger colectas_set_updated_at before update on colectas
  for each row execute function set_updated_at();
create trigger donaciones_set_updated_at before update on donaciones
  for each row execute function set_updated_at();

-- Public donations view: everything except the private proof_path.
create view donaciones_public as
  select id, colecta_id, account_id, amount, currency, donor_name, status, created_at
  from donaciones;

alter table colectas enable row level security;
alter table colecta_accounts enable row level security;
alter table donaciones enable row level security;

create policy colectas_read on colectas for select using (hidden = false);
create policy colecta_accounts_read on colecta_accounts for select using (true);
-- donaciones: NO anon policy => base table (incl. proof_path) is unreadable by anon.
grant select on donaciones_public to anon, authenticated;
revoke all on donaciones from anon;
