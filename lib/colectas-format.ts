import type { AccountMethod } from "@/lib/colectas";
import type { AccountRow } from "@/lib/colectas-data";

export function methodLabel(method: AccountMethod | string): string {
  if (method === "pago_movil") return "Pago móvil";
  if (method === "bizum") return "Bizum";
  if (method === "zelle") return "Zelle";
  return method;
}

/** Short one-line label for an account (used in selects / lists). */
export function accountLabel(a: AccountRow): string {
  if (a.method === "pago_movil") {
    return `Pago móvil · ${a.bank_entity ?? ""} · ${a.phone ?? ""}`.trim();
  }
  return `${methodLabel(a.method)} · ${a.email ?? ""}`;
}

export function money(amount: number, currency: string): string {
  return `${currency} ${Number(amount).toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  rejected: "Rechazada",
};

export const STATUS_BADGE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};
