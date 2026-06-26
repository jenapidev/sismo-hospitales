import { describe, it, expect } from "vitest";
import { upsertDriveRecords, type RecordsRepo, type ExistingRecord } from "@/lib/records";
import type { ParsedRecord } from "@/lib/parser";

function parsed(over: Partial<ParsedRecord>): ParsedRecord {
  return {
    fullName: "PEREZ MARIA",
    cedula: "V12345678",
    hospitalName: "Hospital Universitario de Caracas",
    hospitalSlug: "universitario-caracas",
    status: "admitted",
    admissionDate: "2026-06-25",
    age: 35,
    sex: "F",
    notes: null,
    rowRef: "file.pdf#1",
    confidence: 1,
    ...over,
  };
}

function makeRepo(initial: ExistingRecord[] = []): RecordsRepo & {
  rows: Map<string, ExistingRecord>;
  insertedCount: () => number;
  updatedCount: () => number;
} {
  const rows = new Map<string, ExistingRecord>();
  initial.forEach((r) => rows.set(r.source_row_ref, r));
  let inserted = 0;
  let updated = 0;
  return {
    rows,
    insertedCount: () => inserted,
    updatedCount: () => updated,
    async getExisting(refs) {
      const m = new Map<string, ExistingRecord>();
      for (const ref of refs) if (rows.has(ref)) m.set(ref, rows.get(ref)!);
      return m;
    },
    async insertMany(newRows) {
      for (const r of newRows) {
        inserted++;
        rows.set(r.source_row_ref, {
          id: `id-${rows.size}`,
          verification_status: "unverified",
          ...r,
        });
      }
    },
    async updateOne(id, patch) {
      updated++;
      for (const r of rows.values()) if (r.id === id) Object.assign(r, patch);
    },
  };
}

const HOSPITALS = new Map([["universitario-caracas", "hosp-uc"]]);

describe("upsertDriveRecords", () => {
  it("inserts new rows on first run", async () => {
    const repo = makeRepo();
    const res = await upsertDriveRecords(repo, HOSPITALS, [parsed({})], "file.pdf");
    expect(res.inserted).toBe(1);
    expect(res.updated).toBe(0);
  });

  it("is idempotent: a second identical run changes nothing", async () => {
    const repo = makeRepo();
    await upsertDriveRecords(repo, HOSPITALS, [parsed({})], "file.pdf");
    const res2 = await upsertDriveRecords(repo, HOSPITALS, [parsed({})], "file.pdf");
    expect(res2.inserted).toBe(0);
    expect(res2.updated).toBe(0);
    expect(repo.insertedCount()).toBe(1);
    expect(repo.updatedCount()).toBe(0);
  });

  it("updates an existing drive row when content changes", async () => {
    const repo = makeRepo();
    await upsertDriveRecords(repo, HOSPITALS, [parsed({ age: 35 })], "file.pdf");
    const res = await upsertDriveRecords(repo, HOSPITALS, [parsed({ age: 36 })], "file.pdf");
    expect(res.updated).toBe(1);
    expect(repo.rows.get("file.pdf#1")!.age).toBe(36);
  });

  it("never overwrites a coordinator-verified row", async () => {
    const repo = makeRepo([
      {
        id: "id-x",
        source: "drive",
        verification_status: "coordinator_verified",
        source_row_ref: "file.pdf#1",
        full_name: "OLD NAME",
        cedula: "V99999999",
        hospital_id: "hosp-uc",
        status: "admitted",
        age: 99,
        sex: null,
        admission_date: null,
        confidence: 1,
        needs_review: false,
      },
    ]);
    const res = await upsertDriveRecords(repo, HOSPITALS, [parsed({ fullName: "NEW NAME" })], "file.pdf");
    expect(res.updated).toBe(0);
    expect(repo.rows.get("file.pdf#1")!.full_name).toBe("OLD NAME");
  });

  it("never overwrites a public_report row", async () => {
    const repo = makeRepo([
      {
        id: "id-y",
        source: "public_report",
        verification_status: "unverified",
        source_row_ref: "file.pdf#1",
        full_name: "REPORTED",
        cedula: null,
        hospital_id: "hosp-uc",
        status: "admitted",
        age: null,
        sex: null,
        admission_date: null,
        confidence: 1,
        needs_review: false,
      },
    ]);
    const res = await upsertDriveRecords(repo, HOSPITALS, [parsed({})], "file.pdf");
    expect(res.updated).toBe(0);
    expect(repo.rows.get("file.pdf#1")!.full_name).toBe("REPORTED");
  });

  it("flags low-confidence rows as needs_review", async () => {
    const repo = makeRepo();
    await upsertDriveRecords(repo, HOSPITALS, [parsed({ confidence: 0.5 })], "file.pdf");
    expect(repo.rows.get("file.pdf#1")!.needs_review).toBe(true);
  });

  it("skips rows whose hospital cannot be resolved", async () => {
    const repo = makeRepo();
    const res = await upsertDriveRecords(
      repo,
      HOSPITALS,
      [parsed({ hospitalSlug: "unknown-hosp", rowRef: "file.pdf#2" })],
      "file.pdf"
    );
    expect(res.inserted).toBe(0);
    expect(res.skipped).toBe(1);
  });
});
