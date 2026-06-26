import type { Status, VerificationStatus } from "@/lib/types";

export interface StatsRow {
  hospitalId: string;
  status: Status;
  verificationStatus: VerificationStatus;
  needsReview: boolean;
  duplicateGroup: string | null;
}

const STATUSES: Status[] = ["admitted", "discharged", "transferred", "deceased", "unknown"];
const VERIFICATIONS: VerificationStatus[] = [
  "unverified",
  "community_confirmed",
  "coordinator_verified",
  "disputed",
];

export interface Breakdown {
  total: number;
  byStatus: Record<Status, number>;
  byVerification: Record<VerificationStatus, number>;
  needsReview: number;
  duplicates: number;
}

export interface HospitalBreakdown extends Breakdown {
  hospitalId: string;
  name: string;
}

export interface Stats {
  overall: Breakdown;
  perHospital: HospitalBreakdown[];
}

function emptyBreakdown(): Breakdown {
  return {
    total: 0,
    byStatus: Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>,
    byVerification: Object.fromEntries(
      VERIFICATIONS.map((v) => [v, 0])
    ) as Record<VerificationStatus, number>,
    needsReview: 0,
    duplicates: 0,
  };
}

function add(b: Breakdown, row: StatsRow) {
  b.total += 1;
  b.byStatus[row.status] += 1;
  b.byVerification[row.verificationStatus] += 1;
  if (row.needsReview) b.needsReview += 1;
  if (row.duplicateGroup) b.duplicates += 1;
}

/** Aggregate records into overall + per-hospital breakdowns. Pure. */
export function summarize(
  rows: StatsRow[],
  hospitals: { id: string; name: string }[]
): Stats {
  const overall = emptyBreakdown();
  const perId = new Map<string, HospitalBreakdown>();
  for (const h of hospitals) {
    perId.set(h.id, { hospitalId: h.id, name: h.name, ...emptyBreakdown() });
  }

  for (const row of rows) {
    add(overall, row);
    let hb = perId.get(row.hospitalId);
    if (!hb) {
      hb = { hospitalId: row.hospitalId, name: "Hospital no identificado", ...emptyBreakdown() };
      perId.set(row.hospitalId, hb);
    }
    add(hb, row);
  }

  const perHospital = [...perId.values()].sort((a, b) => b.total - a.total);
  return { overall, perHospital };
}
