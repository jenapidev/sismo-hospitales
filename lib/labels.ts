import type { Status, VerificationStatus } from "@/lib/types";

export const STATUS_LABELS: Record<Status, string> = {
  admitted: "Ingresado",
  discharged: "Egresado",
  transferred: "Trasladado",
  deceased: "Fallecido",
  unknown: "Desconocido",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  unverified: "No verificado",
  community_confirmed: "Confirmado por la comunidad",
  coordinator_verified: "Verificado",
  disputed: "En disputa",
};

/** Tailwind classes for a verification badge. */
export const VERIFICATION_BADGE: Record<VerificationStatus, string> = {
  unverified: "bg-gray-100 text-gray-700",
  community_confirmed: "bg-blue-100 text-blue-800",
  coordinator_verified: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
};
