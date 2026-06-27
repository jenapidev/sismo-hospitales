import { normalizeCedula } from "@/lib/cedula";

export const CURRENCIES = ["Bs", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const ACCOUNT_METHODS = ["pago_movil", "bizum", "zelle"] as const;
export type AccountMethod = (typeof ACCOUNT_METHODS)[number];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function nullable(s: string | undefined): string | null {
  const t = (s ?? "").trim();
  return t || null;
}

function currencyOf(s: string | undefined): Currency {
  if (s === "USD") return "USD";
  if (s === "EUR") return "EUR";
  return "Bs";
}

// ---------------------------------------------------------------------------
// Colecta
// ---------------------------------------------------------------------------
export interface ColectaInput {
  title?: string;
  description?: string;
  goalAmount?: string;
  currency?: string;
  adminName?: string;
  adminCedula?: string;
  adminEmail?: string;
}

export interface ColectaPayload {
  title: string;
  description: string | null;
  goalAmount: number | null;
  currency: Currency;
  adminName: string;
  adminCedula: string;
  adminEmail: string;
}

export type ColectaValidation =
  | { ok: true; value: ColectaPayload }
  | { ok: false; errors: Record<string, string> };

export function validateColecta(input: ColectaInput): ColectaValidation {
  const errors: Record<string, string> = {};

  const title = (input.title ?? "").trim();
  if (title.length < 3) errors.title = "Indica el título de la colecta.";

  const adminName = (input.adminName ?? "").trim();
  if (adminName.length < 2) errors.adminName = "Indica el nombre del responsable.";

  const adminCedulaRaw = (input.adminCedula ?? "").trim();
  let adminCedula = "";
  if (!adminCedulaRaw) errors.adminCedula = "Indica la cédula del responsable.";
  else {
    const norm = normalizeCedula(adminCedulaRaw);
    if (!norm) errors.adminCedula = "Cédula inválida.";
    else adminCedula = norm;
  }

  const adminEmail = (input.adminEmail ?? "").trim();
  if (!adminEmail) errors.adminEmail = "Indica el correo del responsable.";
  else if (!EMAIL_RE.test(adminEmail)) errors.adminEmail = "Correo inválido.";

  let goalAmount: number | null = null;
  const goalRaw = (input.goalAmount ?? "").trim();
  if (goalRaw) {
    const n = Number(goalRaw);
    if (!Number.isFinite(n) || n < 0) errors.goalAmount = "Meta inválida.";
    else goalAmount = n;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      description: nullable(input.description),
      goalAmount,
      currency: currencyOf(input.currency),
      adminName,
      adminCedula,
      adminEmail,
    },
  };
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------
export interface AccountInput {
  method?: string;
  phone?: string;
  bankEntity?: string;
  cedula?: string;
  email?: string;
  ownerName?: string;
}

export interface AccountPayload {
  method: AccountMethod;
  phone: string | null;
  bankEntity: string | null;
  cedula: string | null;
  email: string | null;
  ownerName: string | null;
}

export type AccountValidation =
  | { ok: true; value: AccountPayload }
  | { ok: false; errors: Record<string, string> };

export function validateAccount(input: AccountInput): AccountValidation {
  const errors: Record<string, string> = {};
  const method = (input.method ?? "").trim();
  if (!ACCOUNT_METHODS.includes(method as AccountMethod)) {
    return { ok: false, errors: { method: "Método inválido." } };
  }

  let phone: string | null = null;
  let bankEntity: string | null = null;
  let cedula: string | null = null;
  let email: string | null = null;
  let ownerName: string | null = null;

  if (method === "pago_movil") {
    phone = (input.phone ?? "").trim();
    bankEntity = (input.bankEntity ?? "").trim();
    if (phone.length < 7) errors.phone = "Indica el teléfono.";
    if (bankEntity.length < 2) errors.bankEntity = "Indica el banco.";
    const cedRaw = (input.cedula ?? "").trim();
    if (!cedRaw) errors.cedula = "Indica la cédula.";
    else {
      const norm = normalizeCedula(cedRaw);
      if (!norm) errors.cedula = "Cédula inválida.";
      else cedula = norm;
    }
  } else {
    // bizum / zelle
    email = (input.email ?? "").trim();
    ownerName = (input.ownerName ?? "").trim();
    if (!EMAIL_RE.test(email)) errors.email = "Correo inválido.";
    if (ownerName.length < 2) errors.ownerName = "Indica el titular.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      method: method as AccountMethod,
      phone: phone || null,
      bankEntity: bankEntity || null,
      cedula: cedula || null,
      email: email || null,
      ownerName: ownerName || null,
    },
  };
}

// ---------------------------------------------------------------------------
// Donación
// ---------------------------------------------------------------------------
export interface DonacionInput {
  amount?: string;
  currency?: string;
  donorName?: string;
  accountId?: string;
  hasProof?: boolean;
}

export interface DonacionPayload {
  amount: number;
  currency: Currency;
  donorName: string | null;
  accountId: string | null;
}

export type DonacionValidation =
  | { ok: true; value: DonacionPayload }
  | { ok: false; errors: Record<string, string> };

export function validateDonacion(input: DonacionInput): DonacionValidation {
  const errors: Record<string, string> = {};

  let amount = 0;
  const amountRaw = (input.amount ?? "").trim();
  const n = Number(amountRaw);
  if (!amountRaw || !Number.isFinite(n) || n <= 0) errors.amount = "Indica un monto válido.";
  else amount = n;

  if (!input.hasProof) errors.proof = "Adjunta el comprobante.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      amount,
      currency: currencyOf(input.currency),
      donorName: nullable(input.donorName),
      accountId: nullable(input.accountId),
    },
  };
}
