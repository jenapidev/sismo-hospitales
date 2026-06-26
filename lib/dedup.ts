import { foldAccents } from "@/lib/parser/hospitals";

/** Minimal row shape needed to detect cross-hospital duplicates. */
export interface DedupRow {
  id: string;
  cedula: string | null;
  fullName: string;
  age: number | null;
  hospitalId: string;
}

/** Normalize a name for fuzzy matching: accent-fold, upper-case, collapse spaces. */
function foldName(name: string): string {
  return foldAccents(name).toUpperCase().replace(/\s+/g, " ").trim();
}

/**
 * The matching key for a row, or null if it can't be matched:
 * - cédula present → match on cédula
 * - else name + age present → match on name+age
 * - else unmatched (too weak)
 */
function keyFor(row: DedupRow): string | null {
  if (row.cedula) return `ced:${row.cedula.toUpperCase()}`;
  if (row.fullName && row.age != null) return `na:${foldName(row.fullName)}|${row.age}`;
  return null;
}

/**
 * Group records that refer to the same person across **two or more distinct
 * hospitals**. Returns a map of matching-key → record ids in that group.
 * Same-key rows confined to a single hospital are NOT returned.
 */
export function groupDuplicates(rows: DedupRow[]): Map<string, string[]> {
  const byKey = new Map<string, DedupRow[]>();
  for (const row of rows) {
    const key = keyFor(row);
    if (!key) continue;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(row);
    else byKey.set(key, [row]);
  }

  const result = new Map<string, string[]>();
  for (const [key, bucket] of byKey) {
    const hospitals = new Set(bucket.map((r) => r.hospitalId));
    if (hospitals.size >= 2) result.set(key, bucket.map((r) => r.id));
  }
  return result;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Recompute duplicate groups over all visible records and persist
 * `duplicate_group`. Idempotent: rows in a group get a shared uuid; rows no
 * longer in any group are cleared. `admin` is a service-role client.
 */
export async function applyDuplicateGroups(
  admin: any,
  newId: () => string = () => globalThis.crypto.randomUUID()
): Promise<{ groups: number; flagged: number }> {
  const { data, error } = await admin
    .from("records")
    .select("id,cedula,full_name,age,hospital_id,duplicate_group")
    .eq("hidden", false);
  if (error) throw new Error(`applyDuplicateGroups read failed: ${error.message}`);

  const rows: (DedupRow & { duplicate_group: string | null })[] = (data ?? []).map(
    (r: any) => ({
      id: r.id,
      cedula: r.cedula,
      fullName: r.full_name,
      age: r.age,
      hospitalId: r.hospital_id,
      duplicate_group: r.duplicate_group,
    })
  );

  const groups = groupDuplicates(rows);

  // Build desired duplicate_group per id.
  const desired = new Map<string, string | null>();
  for (const r of rows) desired.set(r.id, null);
  for (const ids of groups.values()) {
    const gid = newId();
    for (const id of ids) desired.set(id, gid);
  }

  // Only write rows whose group actually changed.
  let flagged = 0;
  for (const r of rows) {
    const want = desired.get(r.id) ?? null;
    if (want === r.duplicate_group) continue;
    const { error: upErr } = await admin
      .from("records")
      .update({ duplicate_group: want })
      .eq("id", r.id);
    if (upErr) throw new Error(`applyDuplicateGroups write failed: ${upErr.message}`);
    if (want) flagged++;
  }

  return { groups: groups.size, flagged };
}
