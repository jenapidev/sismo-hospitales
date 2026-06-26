import { normalizeCedula } from "@/lib/cedula";
import type { PublicRecord, Status, VerificationStatus } from "@/lib/types";

export interface SearchPlan {
  mode: "cedula" | "name" | "empty";
  value: string;
}

/** Decide whether a query is a cédula lookup or a name search. */
export function buildSearchPlan(query: string): SearchPlan {
  const trimmed = query.trim();
  if (!trimmed) return { mode: "empty", value: "" };
  const ced = normalizeCedula(trimmed);
  if (ced) return { mode: "cedula", value: ced };
  return { mode: "name", value: trimmed };
}

/** A row as selected from the `records_public` view. */
interface PublicRow {
  id: string;
  full_name: string;
  cedula: string | null;
  hospital_id: string;
  status: Status;
  age: number | null;
  admission_date: string | null;
  notes: string | null;
  verification_status: VerificationStatus;
}

export function toPublicRecord(row: PublicRow, hospitalName: string): PublicRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    cedula: row.cedula,
    hospitalId: row.hospital_id,
    hospitalName,
    status: row.status,
    age: row.age,
    admissionDate: row.admission_date,
    notes: row.notes,
    verificationStatus: row.verification_status,
  };
}

const MAX_RESULTS = 100;

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Search the public registry by name or cédula. Reads only `records_public`
 * (anon-safe view), so no private fields can leak.
 */
export async function searchRecords(
  supabase: any,
  query: string
): Promise<PublicRecord[]> {
  const plan = buildSearchPlan(query);
  if (plan.mode === "empty") return [];

  const { data: hospitals } = await supabase.from("hospitals").select("id,name");
  const hmap = new Map<string, string>(
    (hospitals ?? []).map((h: { id: string; name: string }) => [h.id, h.name])
  );

  let q = supabase.from("records_public").select("*");
  if (plan.mode === "cedula") q = q.eq("cedula", plan.value);
  else q = q.ilike("full_name", `%${plan.value}%`);

  const { data, error } = await q.order("full_name").limit(MAX_RESULTS);
  if (error) throw new Error(error.message);

  return (data ?? []).map((r: PublicRow) =>
    toPublicRecord(r, hmap.get(r.hospital_id) ?? "Hospital no identificado")
  );
}
