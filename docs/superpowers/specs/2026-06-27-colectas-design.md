# Colectas — Donation Drives & Donations

**Date:** 2026-06-27
**Status:** Design (pending spec review)
**Part of:** Sismo · Hospitales

## Purpose

Help organizers run public **colectas** (donation drives) for the earthquake response.
The app does NOT process money — it publishes how to donate (payment accounts), lets
anyone record a **donación** with a proof image, and lets the colecta owner confirm
donations so a public total adds up. Builds on the acopio pattern (public CRUD,
email-login owner, image uploads, private proofs).

## Goals

1. CRUD for **colectas**, owned and managed by an email-login user.
2. Each colecta specifies **one or more payment accounts**:
   - **Pago móvil** — phone, bank entity, cédula
   - **Bizum** — email, owner
   - **Zelle** — email, owner
3. Colecta **admin identity** is public: name, cédula, email.
4. Anyone can record a **donación** (no login): amount, donor name (optional), which
   account used, and a **required proof image**.
5. **Proof images are private** (owner/coordinator only); the donations list is public.
6. **Goal + total raised**: a progress bar from **confirmed** donations.

## Non-goals

- No money processing/escrow. No coordinator verification/hide in v1 (owner-managed;
  `hidden` column reserved for later).
- No messages on donations; no multi-currency conversion (totals are per-currency).

## Access & privacy

- **Colectas + accounts are fully public** (donors need account info to pay).
- **Donations:** the list (amount, donor name, date, status) is public via a view; the
  **proof image** and the base table are NOT anon-readable.
- **Owners** (email magic-link, open to anyone, same as acopio) create and manage their
  colecta: edit it, manage accounts, and **confirm/reject** donations after viewing proof.
  `owner_user_id` gates edits; coordinators may also manage (reserved).
- Proof images live in the existing private `proofs` bucket (folder `donations`),
  accessed via short-lived signed URLs by the colecta owner or a coordinator.

## Data model

**`colectas`**
- `id`, `title`, `description`, `goal_amount` (numeric, nullable), `currency`
  (`Bs` | `USD`, default `Bs`),
- `admin_name`, `admin_cedula`, `admin_email` (all required, public),
- `owner_user_id` (managing auth user), `hidden` (default false), `created_at`, `updated_at`.

**`colecta_accounts`** (1..n per colecta)
- `id`, `colecta_id` → colectas (cascade), `method` (`pago_movil` | `bizum` | `zelle`),
- `phone`, `bank_entity`, `cedula` (pago móvil),
- `email`, `owner_name` (bizum / zelle),
- `created_at`. (Per-method fields validated in the app; unused columns null.)

**`donaciones`**
- `id`, `colecta_id` → colectas (cascade), `account_id` → colecta_accounts (set null),
- `amount` (numeric), `currency` (`Bs` | `USD`), `donor_name` (nullable),
- `proof_path` (text, **required**, private),
- `status` (`pending` | `confirmed` | `rejected`, default `pending`),
- `created_at`, `updated_at`.

**`donaciones_public`** view — `id, colecta_id, account_id, amount, currency, donor_name,
status, created_at`. **No `proof_path`.**

**RLS:** anon may `select` non-hidden `colectas`, all `colecta_accounts`, and
`donaciones_public`. The base `donaciones` table has no anon select (keeps `proof_path`
private). All writes go through service-role server actions after auth/ownership checks.

### Totals
`total_raised` = sum of `amount` for `status='confirmed'` donations whose `currency` =
the colecta's `currency`. Donations in another currency are listed but not in the bar.

## Pages

- `/colectas` — directory: list with goal/progress, search by title, "Crear colecta".
- `/colectas/[id]` — detail: description, progress bar, **how to donate** (the accounts),
  public donations list (amount, donor, date, status badge), and a **"Registrar mi
  donación"** form (public; uploads proof).
- `/colectas/nueva` — create (login-gated).
- `/colectas/[id]/gestionar` — owner: edit colecta, add/remove accounts, review donations
  (view proof via signed URL, confirm/reject/delete), delete colecta.
- `/colectas/login` — owner magic-link (reuses the login form; `next` redirect).

## Server actions (`app/actions/colectas.ts`)

- `createColecta(prev, fd)` — require login; `validateColecta`; insert with `owner_user_id`;
  redirect to gestionar.
- `updateColecta(prev, fd)` / `deleteColecta(fd)` — require owner/coordinator.
- `addAccount(fd)` / `deleteAccount(fd)` — require owner of the account's colecta.
- `submitDonacion(prev, fd)` — public; `validateDonacion`; upload proof to `proofs/donations`;
  insert `pending`.
- `confirmDonacion(fd)` / `rejectDonacion(fd)` / `deleteDonacion(fd)` — require owner.
- `getDonacionProofUrl(donacionId)` — require owner-or-coordinator of that colecta → signed URL.

Access helper (extend `lib/auth.ts`): `canManageColecta(user, { owner_user_id })` (owner or
coordinator) — same logic as `canManageCenter`.

## Validation (pure, tested) — `lib/colectas.ts`

- `validateColecta`: `title` ≥ 3, `admin_name` ≥ 2, `admin_cedula` required → normalized,
  `admin_email` required → basic email check, `goal_amount` optional numeric ≥ 0, `currency`
  ∈ {Bs, USD}.
- `validateAccount`: `method` ∈ {pago_movil, bizum, zelle}; required per method —
  pago_movil: phone (≥ 7 chars), bank_entity (≥ 2), cédula (normalized);
  bizum/zelle: email (valid), owner_name (≥ 2).
- `validateDonacion`: `amount` required numeric > 0, `currency` ∈ {Bs, USD}, `donor_name`
  optional, `accountId` optional, `hasProof` required.

## Testing

- Unit: `validateColecta`, `validateAccount` (each method + failures), `validateDonacion`.
- Live smoke after migration: create colecta + an account, submit a donación (proof
  upload), confirm it, verify the public total reflects it and anon cannot read `proof_path`.

## Deploy delta

- New migration `supabase/migrations/0004_colectas.sql` (paste into Supabase SQL editor).
- Reuses the `proofs` bucket. Add "Colectas" to the sidebar nav. No new deps.
