import { normalizeCedula } from "@/lib/cedula";
import type { Status } from "@/lib/types";

const STATUSES: Status[] = ["admitted", "discharged", "transferred", "deceased", "unknown"];

export interface ReportInput {
  fullName?: string;
  hospitalId?: string;
  status?: string;
  cedula?: string;
  age?: string;
  sex?: string;
  submitterName?: string;
  submitterContact?: string;
  hasProof?: boolean;
}

export interface ReportPayload {
  fullName: string;
  hospitalId: string;
  status: Status;
  cedula: string | null;
  age: number | null;
  sex: string | null;
  submitterName: string;
  submitterContact: string;
}

export type ReportValidation =
  | { ok: true; value: ReportPayload }
  | { ok: false; errors: Record<string, string> };

/** Validate a public report submission. Pure — file upload handled by the action. */
export function validateReport(input: ReportInput): ReportValidation {
  const errors: Record<string, string> = {};

  const fullName = (input.fullName ?? "").trim();
  if (fullName.length < 2) errors.fullName = "Indica el nombre completo.";

  const hospitalId = (input.hospitalId ?? "").trim();
  if (!hospitalId) errors.hospitalId = "Selecciona un hospital.";

  const statusRaw = (input.status ?? "admitted").trim();
  if (!STATUSES.includes(statusRaw as Status)) errors.status = "Estado inválido.";

  const submitterName = (input.submitterName ?? "").trim();
  if (submitterName.length < 2) errors.submitterName = "Indica tu nombre.";

  const submitterContact = (input.submitterContact ?? "").trim();
  if (submitterContact.length < 3)
    errors.submitterContact = "Indica un teléfono o correo de contacto.";

  if (!input.hasProof) errors.proof = "Adjunta una prueba de identidad de la persona.";

  let cedula: string | null = null;
  const cedRaw = (input.cedula ?? "").trim();
  if (cedRaw) {
    cedula = normalizeCedula(cedRaw);
    if (!cedula) errors.cedula = "Cédula inválida.";
  }

  let age: number | null = null;
  const ageRaw = (input.age ?? "").trim();
  if (ageRaw) {
    const n = Number(ageRaw);
    if (!Number.isInteger(n) || n < 0 || n > 130) errors.age = "Edad inválida.";
    else age = n;
  }

  const sex = (input.sex ?? "").trim() || null;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      fullName,
      hospitalId,
      status: statusRaw as Status,
      cedula,
      age,
      sex,
      submitterName,
      submitterContact,
    },
  };
}
