import type { ParsedRecord } from "@/lib/parser";
import type { RecordSource, Status, VerificationStatus } from "@/lib/types";

/** The subset of an existing record we need to decide insert/update/skip. */
export interface ExistingRecord {
  id: string;
  source: RecordSource;
  verification_status: VerificationStatus;
  source_row_ref: string;
  full_name: string;
  cedula: string | null;
  hospital_id: string;
  status: Status;
  age: number | null;
  sex: string | null;
  admission_date: string | null;
  confidence: number;
  needs_review: boolean;
}

/** Row payload written for a drive-sourced record. */
export interface DriveRecordPayload {
  full_name: string;
  cedula: string | null;
  hospital_id: string;
  status: Status;
  admission_date: string | null;
  age: number | null;
  sex: string | null;
  notes: string | null;
  source: "drive";
  source_file: string;
  source_row_ref: string;
  confidence: number;
  needs_review: boolean;
}

/** Storage abstraction so the upsert logic is testable without a live DB. */
export interface RecordsRepo {
  getExisting(refs: string[]): Promise<Map<string, ExistingRecord>>;
  insertMany(rows: DriveRecordPayload[]): Promise<void>;
  updateOne(id: string, patch: Partial<DriveRecordPayload>): Promise<void>;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  flaggedReview: number;
  skipped: number;
}

const REVIEW_THRESHOLD = 0.6;

// Fields compared to decide whether an existing drive row actually changed.
const COMPARE_FIELDS: (keyof DriveRecordPayload & keyof ExistingRecord)[] = [
  "full_name",
  "cedula",
  "hospital_id",
  "status",
  "age",
  "sex",
  "admission_date",
  "confidence",
  "needs_review",
];

function unchanged(ex: ExistingRecord, payload: DriveRecordPayload): boolean {
  return COMPARE_FIELDS.every((f) => ex[f] === payload[f]);
}

/**
 * Upsert drive-parsed records idempotently.
 *
 * - Key: `source_row_ref` (already `${file}#${line}`, unique per file).
 * - Inserts new rows; updates changed drive rows; no-ops unchanged ones.
 * - NEVER overwrites human data: rows whose `source != 'drive'` or that are
 *   `coordinator_verified` are left untouched.
 * - Rows with `confidence < 0.6` are flagged `needs_review`.
 * - Rows whose hospital slug isn't in `hospitalIdBySlug` are skipped (counted).
 */
export async function upsertDriveRecords(
  repo: RecordsRepo,
  hospitalIdBySlug: Map<string, string>,
  parsed: ParsedRecord[],
  fileName: string
): Promise<UpsertResult> {
  const usable = parsed.filter(
    (p) => p.hospitalSlug && hospitalIdBySlug.has(p.hospitalSlug)
  );
  const skipped = parsed.length - usable.length;

  const existing = await repo.getExisting(usable.map((p) => p.rowRef));

  const toInsert: DriveRecordPayload[] = [];
  let updated = 0;
  let flaggedReview = 0;

  for (const p of usable) {
    const hospital_id = hospitalIdBySlug.get(p.hospitalSlug!)!;
    const needs_review = p.confidence < REVIEW_THRESHOLD;
    if (needs_review) flaggedReview++;

    const payload: DriveRecordPayload = {
      full_name: p.fullName,
      cedula: p.cedula,
      hospital_id,
      status: p.status,
      admission_date: p.admissionDate,
      age: p.age,
      sex: p.sex,
      notes: p.notes,
      source: "drive",
      source_file: fileName,
      source_row_ref: p.rowRef,
      confidence: p.confidence,
      needs_review,
    };

    const ex = existing.get(p.rowRef);
    if (!ex) {
      toInsert.push(payload);
      continue;
    }
    // Protect human data.
    if (ex.source !== "drive" || ex.verification_status === "coordinator_verified") {
      continue;
    }
    if (unchanged(ex, payload)) continue;
    await repo.updateOne(ex.id, payload);
    updated++;
  }

  if (toInsert.length) await repo.insertMany(toInsert);

  return { inserted: toInsert.length, updated, flaggedReview, skipped };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Real Supabase-backed repo. `admin` is a service-role client (bypasses RLS).
 */
export function createSupabaseRecordsRepo(admin: any): RecordsRepo {
  return {
    async getExisting(refs: string[]) {
      const map = new Map<string, ExistingRecord>();
      const cols =
        "id,source,verification_status,source_row_ref,full_name,cedula,hospital_id,status,age,sex,admission_date,confidence,needs_review";
      for (let i = 0; i < refs.length; i += 500) {
        const chunk = refs.slice(i, i + 500);
        const { data, error } = await admin
          .from("records")
          .select(cols)
          .in("source_row_ref", chunk);
        if (error) throw new Error(`getExisting failed: ${error.message}`);
        for (const r of data ?? []) map.set(r.source_row_ref, r as ExistingRecord);
      }
      return map;
    },
    async insertMany(rows: DriveRecordPayload[]) {
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error } = await admin.from("records").insert(chunk);
        if (error) throw new Error(`insertMany failed: ${error.message}`);
      }
    },
    async updateOne(id: string, patch: Partial<DriveRecordPayload>) {
      const { error } = await admin.from("records").update(patch).eq("id", id);
      if (error) throw new Error(`updateOne failed: ${error.message}`);
    },
  };
}
