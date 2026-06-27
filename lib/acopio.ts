import { normalizeCedula } from "@/lib/cedula";

export interface CenterInput {
  name?: string;
  address?: string;
  lat?: string;
  lng?: string;
  managerName?: string;
  managerCedula?: string;
  orgName?: string;
  orgId?: string;
  aidDestination?: string;
}

export interface CenterPayload {
  name: string;
  address: string;
  lat: number;
  lng: number;
  managerName: string;
  managerCedula: string | null;
  orgName: string | null;
  orgId: string | null;
  aidDestination: string | null;
}

export type CenterValidation =
  | { ok: true; value: CenterPayload }
  | { ok: false; errors: Record<string, string> };

function nullable(s: string | undefined): string | null {
  const t = (s ?? "").trim();
  return t || null;
}

export function validateCenter(input: CenterInput): CenterValidation {
  const errors: Record<string, string> = {};

  const name = (input.name ?? "").trim();
  if (name.length < 2) errors.name = "Indica el nombre del centro.";

  const address = (input.address ?? "").trim();
  if (address.length < 3) errors.address = "Indica la dirección.";

  const managerName = (input.managerName ?? "").trim();
  if (managerName.length < 2) errors.managerName = "Indica el nombre del responsable.";

  const lat = Number(input.lat);
  if (!input.lat || !Number.isFinite(lat) || lat < -90 || lat > 90)
    errors.lat = "Marca la ubicación en el mapa.";

  const lng = Number(input.lng);
  if (!input.lng || !Number.isFinite(lng) || lng < -180 || lng > 180)
    errors.lng = "Marca la ubicación en el mapa.";

  let managerCedula: string | null = null;
  const cedRaw = (input.managerCedula ?? "").trim();
  if (cedRaw) {
    managerCedula = normalizeCedula(cedRaw);
    if (!managerCedula) errors.managerCedula = "Cédula inválida.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      address,
      lat,
      lng,
      managerName,
      managerCedula,
      orgName: nullable(input.orgName),
      orgId: nullable(input.orgId),
      aidDestination: nullable(input.aidDestination),
    },
  };
}

export interface ItemInput {
  kind?: string;
  name?: string;
  category?: string;
  quantity?: string;
  unit?: string;
}

export interface ItemPayload {
  kind: "have" | "need";
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
}

export type ItemValidation =
  | { ok: true; value: ItemPayload }
  | { ok: false; errors: Record<string, string> };

export function validateItem(input: ItemInput): ItemValidation {
  const errors: Record<string, string> = {};

  const kind = (input.kind ?? "").trim();
  if (kind !== "have" && kind !== "need") errors.kind = "Tipo inválido.";

  const name = (input.name ?? "").trim();
  if (name.length < 1) errors.name = "Indica el insumo.";

  let quantity: number | null = null;
  const qRaw = (input.quantity ?? "").trim();
  if (qRaw) {
    const n = Number(qRaw);
    if (!Number.isFinite(n) || n < 0) errors.quantity = "Cantidad inválida.";
    else quantity = n;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      kind: kind as "have" | "need",
      name,
      category: nullable(input.category),
      quantity,
      unit: nullable(input.unit),
    },
  };
}
