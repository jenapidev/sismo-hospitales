import { describe, it, expect } from "vitest";
import { summarize, type StatsRow } from "@/lib/stats";

const hospitals = [
  { id: "h1", name: "Hospital A" },
  { id: "h2", name: "Hospital B" },
];

const rows: StatsRow[] = [
  { hospitalId: "h1", status: "admitted", verificationStatus: "unverified", needsReview: true, duplicateGroup: null },
  { hospitalId: "h1", status: "discharged", verificationStatus: "coordinator_verified", needsReview: false, duplicateGroup: "g1" },
  { hospitalId: "h2", status: "admitted", verificationStatus: "unverified", needsReview: false, duplicateGroup: "g1" },
];

describe("summarize", () => {
  const s = summarize(rows, hospitals);

  it("computes overall totals", () => {
    expect(s.overall.total).toBe(3);
    expect(s.overall.byStatus.admitted).toBe(2);
    expect(s.overall.byStatus.discharged).toBe(1);
    expect(s.overall.byVerification.unverified).toBe(2);
    expect(s.overall.byVerification.coordinator_verified).toBe(1);
    expect(s.overall.needsReview).toBe(1);
    expect(s.overall.duplicates).toBe(2);
  });

  it("computes per-hospital breakdowns sorted by total desc", () => {
    expect(s.perHospital).toHaveLength(2);
    const h1 = s.perHospital.find((h) => h.hospitalId === "h1")!;
    expect(h1.name).toBe("Hospital A");
    expect(h1.total).toBe(2);
    const h2 = s.perHospital.find((h) => h.hospitalId === "h2")!;
    expect(h2.total).toBe(1);
    expect(s.perHospital[0].total).toBeGreaterThanOrEqual(s.perHospital[1].total);
  });

  it("includes hospitals with zero records", () => {
    const s2 = summarize([], hospitals);
    expect(s2.overall.total).toBe(0);
    expect(s2.perHospital).toHaveLength(2);
    expect(s2.perHospital.every((h) => h.total === 0)).toBe(true);
  });
});
