"use client";

import { useActionState } from "react";
import type { ColectaState } from "@/app/actions/colectas";

export interface ColectaDefaults {
  colectaId?: string;
  title?: string;
  description?: string | null;
  goalAmount?: number | null;
  currency?: string;
  adminName?: string;
  adminCedula?: string;
  adminEmail?: string;
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-sm text-red-600">{msg}</p>;
}

export function ColectaForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (prev: ColectaState, fd: FormData) => Promise<ColectaState>;
  defaults?: ColectaDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ColectaState, FormData>(action, {});
  const e = state.errors ?? {};
  const field = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-500";
  const label = "block text-sm font-medium text-gray-700";

  return (
    <form action={formAction} className="space-y-4">
      {defaults.colectaId && <input type="hidden" name="colectaId" value={defaults.colectaId} />}
      {e._form && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{e._form}</p>}

      <div>
        <label className={label}>Título de la colecta *</label>
        <input name="title" defaultValue={defaults.title} className={field} />
        <Err msg={e.title} />
      </div>

      <div>
        <label className={label}>Descripción</label>
        <textarea name="description" rows={3} defaultValue={defaults.description ?? ""} className={field} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Meta (opcional)</label>
          <input name="goalAmount" inputMode="decimal" defaultValue={defaults.goalAmount ?? ""} className={field} />
          <Err msg={e.goalAmount} />
        </div>
        <div>
          <label className={label}>Moneda</label>
          <select name="currency" defaultValue={defaults.currency ?? "USD"} className={field}>
            <option value="USD">USD</option>
            <option value="Bs">Bs</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <hr className="border-gray-200" />
      <p className="text-sm text-gray-600">Datos del responsable (públicos, para dar confianza).</p>

      <div>
        <label className={label}>Nombre del responsable *</label>
        <input name="adminName" defaultValue={defaults.adminName} className={field} />
        <Err msg={e.adminName} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Cédula *</label>
          <input name="adminCedula" defaultValue={defaults.adminCedula} className={field} placeholder="V-12.345.678" />
          <Err msg={e.adminCedula} />
        </div>
        <div>
          <label className={label}>Correo *</label>
          <input name="adminEmail" defaultValue={defaults.adminEmail} className={field} placeholder="correo@ejemplo.com" />
          <Err msg={e.adminEmail} />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
