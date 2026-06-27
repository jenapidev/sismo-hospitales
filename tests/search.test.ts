import { describe, it, expect } from "vitest";
import { buildSearchPlan, toPublicRecord, searchRecords, dedupeByCedula } from "@/lib/search";
import type { PublicRecord } from "@/lib/types";

function pr(over: Partial<PublicRecord>): PublicRecord {
  return {
    id: "x",
    fullName: "RAMOS MARYELIS",
    cedula: "V32111741",
    hospitalId: "h1",
    hospitalName: "Hospital Universitario de Caracas",
    status: "admitted",
    age: null,
    admissionDate: null,
    notes: null,
    verificationStatus: "unverified",
    ...over,
  };
}

describe("dedupeByCedula", () => {
  it("collapses same-cédula records at the same hospital into one", () => {
    const out = dedupeByCedula([
      pr({ id: "a" }),
      pr({ id: "b" }),
      pr({ id: "c", fullName: "RAMOS/SILVA MARYELIS" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].cedula).toBe("V32111741");
    expect(out[0].mergedCount).toBe(3);
    expect(out[0].otherHospitals).toEqual([]);
  });

  it("keeps cross-hospital appearances as one result but lists the other hospitals", () => {
    const out = dedupeByCedula([
      pr({ id: "a", hospitalName: "Hospital Universitario de Caracas" }),
      pr({ id: "b", hospitalName: "Hospital Vargas de Caracas" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].otherHospitals).toHaveLength(1);
  });

  it("prefers the most-verified record as canonical", () => {
    const out = dedupeByCedula([
      pr({ id: "a", verificationStatus: "unverified" }),
      pr({ id: "b", verificationStatus: "coordinator_verified" }),
    ]);
    expect(out[0].id).toBe("b");
    expect(out[0].verificationStatus).toBe("coordinator_verified");
  });

  it("never merges records without a cédula", () => {
    const out = dedupeByCedula([
      pr({ id: "a", cedula: null, fullName: "ANA" }),
      pr({ id: "b", cedula: null, fullName: "ANA" }),
    ]);
    expect(out).toHaveLength(2);
  });
});

describe("buildSearchPlan", () => {
  it("treats cédula-like input as an exact cédula match (normalized)", () => {
    expect(buildSearchPlan("V-12.345.678")).toEqual({ mode: "cedula", value: "V12345678" });
    expect(buildSearchPlan("12345678")).toEqual({ mode: "cedula", value: "V12345678" });
  });
  it("treats text as a name match", () => {
    expect(buildSearchPlan("perez maria")).toEqual({ mode: "name", value: "perez maria" });
  });
  it("treats blank input as empty", () => {
    expect(buildSearchPlan("   ")).toEqual({ mode: "empty", value: "" });
  });
});

describe("toPublicRecord", () => {
  it("maps a registry row to the public DTO with full cédula, no private fields", () => {
    const dto = toPublicRecord(
      {
        id: "r1",
        full_name: "PEREZ MARIA",
        cedula: "V12345678",
        hospital_id: "h1",
        status: "admitted",
        age: 35,
        admission_date: "2026-06-25",
        notes: "TRIAJE",
        verification_status: "unverified",
      },
      "Hospital Universitario de Caracas"
    );
    expect(dto).toEqual({
      id: "r1",
      fullName: "PEREZ MARIA",
      cedula: "V12345678",
      hospitalId: "h1",
      hospitalName: "Hospital Universitario de Caracas",
      status: "admitted",
      age: 35,
      admissionDate: "2026-06-25",
      notes: "TRIAJE",
      verificationStatus: "unverified",
    });
    expect("person_id_proof_path" in dto).toBe(false);
    expect("submitter_contact" in dto).toBe(false);
  });
});

// Minimal chainable fake of the supabase client.
function fakeClient(rowsByTable: Record<string, any[]>) {
  return {
    from(table: string) {
      let rows = [...(rowsByTable[table] ?? [])];
      const api: any = {
        select: () => api,
        eq: (col: string, val: unknown) => {
          rows = rows.filter((r) => r[col] === val);
          return api;
        },
        ilike: (col: string, val: string) => {
          const needle = val.replace(/%/g, "").toLowerCase();
          rows = rows.filter((r) => String(r[col]).toLowerCase().includes(needle));
          return api;
        },
        limit: () => api,
        order: () => api,
        then: (resolve: (v: { data: any[]; error: null }) => void) =>
          resolve({ data: rows, error: null }),
      };
      return api;
    },
  };
}

describe("searchRecords", () => {
  const client = fakeClient({
    hospitals: [{ id: "h1", name: "Hospital Universitario de Caracas" }],
    records_public: [
      {
        id: "r1",
        full_name: "PEREZ MARIA",
        cedula: "V12345678",
        hospital_id: "h1",
        status: "admitted",
        age: 35,
        admission_date: "2026-06-25",
        notes: null,
        verification_status: "unverified",
      },
    ],
  });

  it("finds by exact cédula and resolves the hospital name", async () => {
    const res = await searchRecords(client as never, "V-12.345.678");
    expect(res).toHaveLength(1);
    expect(res[0].cedula).toBe("V12345678");
    expect(res[0].hospitalName).toBe("Hospital Universitario de Caracas");
  });

  it("finds by partial name (case-insensitive)", async () => {
    const res = await searchRecords(client as never, "perez");
    expect(res).toHaveLength(1);
    expect(res[0].fullName).toBe("PEREZ MARIA");
  });

  it("returns nothing for a blank query", async () => {
    const res = await searchRecords(client as never, "  ");
    expect(res).toEqual([]);
  });
});
