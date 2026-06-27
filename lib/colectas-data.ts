import { createAnonClient } from "@/lib/supabase/anon";
import type { AccountMethod, Currency } from "@/lib/colectas";

export interface ColectaRow {
  id: string;
  title: string;
  description: string | null;
  goal_amount: number | null;
  currency: Currency;
  admin_name: string;
  admin_cedula: string;
  admin_email: string;
  owner_user_id: string | null;
  hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountRow {
  id: string;
  colecta_id: string;
  method: AccountMethod;
  phone: string | null;
  bank_entity: string | null;
  cedula: string | null;
  email: string | null;
  owner_name: string | null;
}

export interface DonacionRow {
  id: string;
  colecta_id: string;
  account_id: string | null;
  amount: number | null;
  currency: Currency;
  donor_name: string | null;
  status: "pending" | "confirmed" | "rejected";
  created_at: string;
}

export interface ColectaWithTotal extends ColectaRow {
  totalRaised: number;
  confirmedCount: number;
}

/** Sum confirmed donation amounts that match the colecta's own currency. */
function totalFor(colecta: ColectaRow, donations: DonacionRow[]): { total: number; count: number } {
  let total = 0;
  let count = 0;
  for (const d of donations) {
    if (d.status !== "confirmed") continue;
    count += 1;
    if (d.currency === colecta.currency) total += d.amount ?? 0;
  }
  return { total, count };
}

export async function listColectas(): Promise<ColectaWithTotal[]> {
  const supabase = createAnonClient();
  const [{ data: colectas }, { data: donations }] = await Promise.all([
    supabase.from("colectas").select("*").order("created_at", { ascending: false }),
    supabase.from("donaciones_public").select("colecta_id,amount,currency,status"),
  ]);
  const byColecta = new Map<string, DonacionRow[]>();
  for (const d of (donations as DonacionRow[]) ?? []) {
    const arr = byColecta.get(d.colecta_id) ?? [];
    arr.push(d);
    byColecta.set(d.colecta_id, arr);
  }
  return ((colectas as ColectaRow[]) ?? []).map((c) => {
    const { total, count } = totalFor(c, byColecta.get(c.id) ?? []);
    return { ...c, totalRaised: total, confirmedCount: count };
  });
}

/** Colectas owned by a given user, with totals. */
export async function listColectasByOwner(ownerId: string): Promise<ColectaWithTotal[]> {
  const all = await listColectas();
  return all.filter((c) => c.owner_user_id === ownerId);
}

export async function getColecta(id: string): Promise<ColectaRow | null> {
  const supabase = createAnonClient();
  const { data } = await supabase.from("colectas").select("*").eq("id", id).maybeSingle();
  return (data as ColectaRow) ?? null;
}

export async function listAccounts(colectaId: string): Promise<AccountRow[]> {
  const supabase = createAnonClient();
  const { data } = await supabase
    .from("colecta_accounts")
    .select("*")
    .eq("colecta_id", colectaId)
    .order("created_at");
  return (data as AccountRow[]) ?? [];
}

export async function listDonaciones(colectaId: string): Promise<DonacionRow[]> {
  const supabase = createAnonClient();
  const { data } = await supabase
    .from("donaciones_public")
    .select("*")
    .eq("colecta_id", colectaId)
    .order("created_at", { ascending: false });
  return (data as DonacionRow[]) ?? [];
}

/** Total raised (confirmed, colecta currency) for a single colecta. */
export function totalRaised(colecta: ColectaRow, donations: DonacionRow[]): number {
  return totalFor(colecta, donations).total;
}
