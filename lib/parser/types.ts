import type { Status } from "@/lib/types";

/** One person extracted from a Drive document row. */
export interface ParsedRecord {
  fullName: string;
  cedula: string | null;
  /** Hospital as written in the row (mixed-hospital files carry it per-row). */
  hospitalName: string | null;
  /** Canonical slug resolved from hospitalName, or null if unrecognized. */
  hospitalSlug: string | null;
  status: Status;
  admissionDate: string | null; // ISO yyyy-mm-dd
  age: number | null;
  sex: string | null;
  notes: string | null;
  /** Stable per-row id: `${sourceFile}#${lineIndex}` — used for idempotent upsert. */
  rowRef: string;
  /** 0..1 — lower means the row was ambiguous and should go to review. */
  confidence: number;
}
