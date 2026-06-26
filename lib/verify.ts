import type { VerificationStatus } from "@/lib/types";

export const COMMUNITY_CONFIRM_THRESHOLD = 2;
const DISPUTE_THRESHOLD = 2;

/**
 * Compute a record's verification status from community confirm/dispute counts.
 * Coordinator verification is terminal — the community can't override it.
 */
export function nextStatusAfterVerification(
  current: VerificationStatus,
  confirmCount: number,
  disputeCount: number
): VerificationStatus {
  if (current === "coordinator_verified") return "coordinator_verified";
  if (disputeCount >= DISPUTE_THRESHOLD && disputeCount > confirmCount) return "disputed";
  if (confirmCount >= COMMUNITY_CONFIRM_THRESHOLD) return "community_confirmed";
  return "unverified";
}

export interface VerificationInput {
  claim?: string;
  verifierName?: string;
  verifierContact?: string;
  note?: string;
  hasProof?: boolean;
}

export interface VerificationPayload {
  claim: "confirm" | "dispute";
  verifierName: string;
  verifierContact: string;
  note: string | null;
}

export type VerificationValidation =
  | { ok: true; value: VerificationPayload }
  | { ok: false; errors: Record<string, string> };

export function validateVerification(input: VerificationInput): VerificationValidation {
  const errors: Record<string, string> = {};

  const claim = (input.claim ?? "").trim();
  if (claim !== "confirm" && claim !== "dispute") errors.claim = "Indica si confirmas o disputas.";

  const verifierName = (input.verifierName ?? "").trim();
  if (verifierName.length < 2) errors.verifierName = "Indica tu nombre.";

  const verifierContact = (input.verifierContact ?? "").trim();
  if (verifierContact.length < 3) errors.verifierContact = "Indica un contacto.";

  if (!input.hasProof) errors.proof = "Adjunta tu prueba de identidad.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      claim: claim as "confirm" | "dispute",
      verifierName,
      verifierContact,
      note: (input.note ?? "").trim() || null,
    },
  };
}
