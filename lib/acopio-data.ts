import { createAnonClient } from "@/lib/supabase/anon";
import type { VerificationStatus } from "@/lib/types";

export interface AcopioCenter {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  aid_destination: string | null;
  manager_name: string;
  manager_cedula: string | null;
  org_name: string | null;
  org_id: string | null;
  owner_user_id: string | null;
  verification_status: VerificationStatus;
  hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcopioItem {
  id: string;
  center_id: string;
  kind: "have" | "need";
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
}

export interface CenterWithCounts extends AcopioCenter {
  haveCount: number;
  needCount: number;
}

/** All visible centers with have/need item counts, ordered by name. */
export async function listCenters(): Promise<CenterWithCounts[]> {
  const supabase = createAnonClient();
  const [{ data: centers }, { data: items }] = await Promise.all([
    supabase.from("acopio_centers").select("*").order("name"),
    supabase.from("acopio_items").select("center_id,kind"),
  ]);
  const have = new Map<string, number>();
  const need = new Map<string, number>();
  for (const it of items ?? []) {
    const m = it.kind === "have" ? have : need;
    m.set(it.center_id, (m.get(it.center_id) ?? 0) + 1);
  }
  return (centers ?? []).map((c: AcopioCenter) => ({
    ...c,
    haveCount: have.get(c.id) ?? 0,
    needCount: need.get(c.id) ?? 0,
  }));
}

export async function getCenter(id: string): Promise<AcopioCenter | null> {
  const supabase = createAnonClient();
  const { data } = await supabase.from("acopio_centers").select("*").eq("id", id).maybeSingle();
  return (data as AcopioCenter) ?? null;
}

export async function listItems(centerId: string): Promise<AcopioItem[]> {
  const supabase = createAnonClient();
  const { data } = await supabase
    .from("acopio_items")
    .select("*")
    .eq("center_id", centerId)
    .order("kind")
    .order("name");
  return (data as AcopioItem[]) ?? [];
}
