# Centros de Acopio — Directory, Inventory & Map

**Date:** 2026-06-26
**Status:** Design (pending spec review)
**Part of:** Sismo · Hospitales

## Purpose

A public directory of **centros de acopio** (relief collection centers) for the Venezuela
earthquake response. Anyone can find a center on a map, see what it **has** and **needs**,
who runs it, and where the received aid is being sent. Anyone can register and manage a
center.

## Goals

1. Public directory of centers on a **map** + searchable list.
2. Per-center **inventory** of supplies: what they **have** and what they **need**.
3. **Location**: shown on a map (pin) and written (address).
4. **Head manager**: name + cédula (public).
5. Optional **organization**: org name + org id (public).
6. **Destino de Ayuda**: free text describing where received resources are going.
7. **Open management**: anyone can register a center (if it doesn't exist) and manage it.

## Non-goals

- No donation payments or logistics tracking.
- No private/ID-proof uploads (all center data is public).
- Not tied to the hospital records subsystem (separate tables and pages).

## Identity & access

- **Managers authenticate by email magic link** — the same mechanism coordinators use,
  but open to anyone. Registering or editing a center requires being signed in.
- A center is owned by `owner_user_id` (the auth user who created it). **Only the owner or
  a coordinator** can edit the center and its inventory.
- Centers are **unique by name** (case-insensitive) — you can't register a duplicate.
- All center fields (incl. manager cédula, org id) are **public** by design.

## Data model

**`acopio_centers`**
- `id`, `name` (unique, case-insensitive), `address`, `lat`, `lng`,
- `aid_destination` (text — "Destino de Ayuda"),
- `manager_name`, `manager_cedula` (nullable), `org_name` (nullable), `org_id` (nullable),
- `owner_user_id` (uuid — the managing auth user),
- `verification_status` (`unverified` | `coordinator_verified`), `verified_by`, `verified_at`,
- `hidden` (moderation), `created_at`, `updated_at`.

**`acopio_items`** — one supply line per row
- `id`, `center_id` → acopio_centers (on delete cascade),
- `kind` (`have` | `need`), `name`, `category` (nullable), `quantity` (numeric, nullable),
  `unit` (nullable), `created_at`, `updated_at`.

**RLS:** anon can `select` non-hidden centers and their items (everything is public). All
writes go through server actions using the service role after an ownership/coordinator
check. No anon write policies.

## Map (free, no API key)

- **Leaflet + OpenStreetMap** tiles via `react-leaflet` (client-only, dynamic import).
- **PinPicker** (registration/edit): click the map to set `lat`/`lng`; shows current marker.
- **CenterMap** (detail): single marker at the center.
- **DirectoryMap** (`/acopio`): all center markers, click → center page.
- Leaflet's default-marker-icon bundler issue handled by setting an explicit icon.

## Pages

- `/acopio` — directory: map with all pins + list (name, verified badge, have/need counts),
  client-side name filter.
- `/acopio/[id]` — detail: location (map + address), **Destino de Ayuda**, manager + org,
  and two inventory lists (**Tenemos** / **Necesitamos**).
- `/acopio/nuevo` — register (requires login): name, address, pin, manager, org, destino.
- `/acopio/[id]/manage` — owner/coordinator: edit center fields + add/update/remove items.
- `/acopio/login` — manager email magic-link (reuses the login form; returns via a `next`
  redirect to the intended page).

## Server actions (`app/actions/acopio.ts`)

- `createCenter(formData)` — require user; `validateCenter`; reject duplicate name; insert
  with `owner_user_id = user.id`; redirect to manage page.
- `updateCenter(formData)` — require owner or coordinator; update fields.
- `addItem` / `updateItem` / `deleteItem` — require owner/coordinator of the center.
- `verifyCenter` / `hideCenter` — require coordinator.

Access helpers (extend `lib/auth.ts`): `getUser()` (any authenticated user) and
`canManageCenter(user, center)` = owner or coordinator.

## Auth callback change

`/auth/callback` honors an optional `next` query param (validated to be a local path),
redirecting there after the code exchange; defaults to `/admin`. The manager login sets
`emailRedirectTo = /auth/callback?next=/acopio/...`.

## Validation (pure, tested)

- `validateCenter(input)`: `name` ≥ 2, `address` ≥ 3, `lat` ∈ [-90,90], `lng` ∈ [-180,180],
  `manager_name` ≥ 2; `manager_cedula` optional → normalized if present; org fields and
  `aid_destination` optional.
- `validateItem(input)`: `kind` ∈ {have, need}, `name` ≥ 1, `quantity` optional numeric ≥ 0,
  `unit`/`category` optional.

## Testing

- Unit: `validateCenter`, `validateItem` (happy path + each failure).
- Live smoke after migration: create a center, add a have/need item, read it back via the
  public anon client, confirm a non-owner cannot edit (ownership check).

## Deploy delta

- New migration `supabase/migrations/0003_acopio.sql` (paste into Supabase SQL editor).
- New deps: `leaflet`, `react-leaflet`, `@types/leaflet`.
- Supabase Auth already configured; the `next`-aware callback needs no new redirect URLs
  beyond `/auth/callback` (already allowlisted).
