import { parseDocument } from "@/lib/parser";
import { upsertDriveRecords, type RecordsRepo } from "@/lib/records";

export interface SyncFile {
  name: string;
  text: string;
}

export interface SyncResult {
  parsed: number;
  inserted: number;
  updated: number;
  flaggedReview: number;
  skipped: number;
  /** Distinct hospital slugs seen across all parsed rows (incl. unmapped). */
  slugs: Set<string>;
}

/**
 * Pipeline core: parse already-downloaded files and upsert their records.
 * Pure of I/O except through the injected `repo`, so it is fully unit-testable
 * and provably idempotent. The real Drive download + run logging live in
 * scripts/sync-drive.ts.
 */
export async function syncParsedFiles(
  repo: RecordsRepo,
  hospitalIdBySlug: Map<string, string>,
  files: SyncFile[]
): Promise<SyncResult> {
  const total: SyncResult = {
    parsed: 0,
    inserted: 0,
    updated: 0,
    flaggedReview: 0,
    skipped: 0,
    slugs: new Set<string>(),
  };

  for (const file of files) {
    const records = parseDocument(file.text, file.name);
    total.parsed += records.length;
    for (const r of records) if (r.hospitalSlug) total.slugs.add(r.hospitalSlug);

    const res = await upsertDriveRecords(repo, hospitalIdBySlug, records, file.name);
    total.inserted += res.inserted;
    total.updated += res.updated;
    total.flaggedReview += res.flaggedReview;
    total.skipped += res.skipped;
  }

  return total;
}
