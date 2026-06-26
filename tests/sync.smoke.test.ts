import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { syncParsedFiles } from "@/lib/sync";
import type { RecordsRepo, ExistingRecord, DriveRecordPayload } from "@/lib/records";

const master = readFileSync("tests/fixtures/master-registry.txt", "utf8");
const consolidado = readFileSync("tests/fixtures/consolidado.txt", "utf8");

const HOSPITALS = new Map([
  ["universitario-caracas", "h-uc"],
  ["catia", "h-catia"],
  ["luciani", "h-luciani"],
  ["vargas-caracas", "h-vargas"],
  ["perez-carreno", "h-perez"],
  ["ricardo-baquero", "h-ricardo"],
]);

function makeRepo() {
  const rows = new Map<string, ExistingRecord>();
  let inserted = 0;
  let updated = 0;
  const repo: RecordsRepo = {
    async getExisting(refs: string[]) {
      const m = new Map<string, ExistingRecord>();
      for (const ref of refs) if (rows.has(ref)) m.set(ref, rows.get(ref)!);
      return m;
    },
    async insertMany(newRows: DriveRecordPayload[]) {
      for (const r of newRows) {
        inserted++;
        rows.set(r.source_row_ref, {
          id: `id-${rows.size}`,
          verification_status: "unverified",
          ...r,
        });
      }
    },
    async updateOne(id: string, patch: Partial<DriveRecordPayload>) {
      updated++;
      for (const r of rows.values()) if (r.id === id) Object.assign(r, patch);
    },
  };
  return { repo, rows, counts: () => ({ inserted, updated }) };
}

describe("syncParsedFiles pipeline", () => {
  const files = [
    { name: "master.txt", text: master },
    { name: "consol.txt", text: consolidado },
  ];

  it("parses and inserts records from both files", async () => {
    const { repo } = makeRepo();
    const res = await syncParsedFiles(repo, HOSPITALS, files);
    expect(res.parsed).toBe(11); // 6 master + 5 consolidado
    expect(res.inserted).toBe(11);
  });

  it("is idempotent at the pipeline level (second run is a no-op)", async () => {
    const { repo, counts } = makeRepo();
    await syncParsedFiles(repo, HOSPITALS, files);
    const res2 = await syncParsedFiles(repo, HOSPITALS, files);
    expect(res2.inserted).toBe(0);
    expect(res2.updated).toBe(0);
    expect(counts().inserted).toBe(11);
    expect(counts().updated).toBe(0);
  });

  it("reports the distinct hospital slugs encountered", async () => {
    const { repo } = makeRepo();
    const res = await syncParsedFiles(repo, HOSPITALS, files);
    expect(res.slugs).toEqual(
      new Set(["universitario-caracas", "catia", "luciani", "vargas-caracas", "perez-carreno"])
    );
  });
});
