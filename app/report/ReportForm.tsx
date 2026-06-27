"use client";

import { useActionState } from "react";
import Link from "next/link";
import { reportPerson, type ReportState } from "@/app/actions/report";
import { STATUS_LABELS } from "@/lib/labels";
import type { Status } from "@/lib/types";

const STATUS_ORDER: Status[] = ["admitted", "transferred", "discharged", "deceased", "unknown"];

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-sm text-red-600">{msg}</p>;
}

export function ReportForm({ hospitals }: { hospitals: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(reportPerson, {});
  const e = state.errors ?? {};
  const field = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-500";
  const label = "block text-sm font-medium text-gray-700";

  return (
    <form action={action} className="space-y-4">
      {e._form && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{e._form}</p>
      )}

      <div>
        <label className={label}>Nombre y apellido de la persona *</label>
        <input name="fullName" className={field} />
        <Err msg={e.fullName} />
      </div>

      <div>
        <label className={label}>Hospital *</label>
        <select name="hospitalId" className={field} defaultValue="">
          <option value="" disabled>
            Selecciona…
          </option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <Err msg={e.hospitalId} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Cédula (si la conoces)</label>
          <input name="cedula" className={field} placeholder="V-12.345.678" />
          <Err msg={e.cedula} />
        </div>
        <div>
          <label className={label}>Estado</label>
          <select name="status" className={field} defaultValue="admitted">
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <Err msg={e.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Edad</label>
          <input name="age" inputMode="numeric" className={field} />
          <Err msg={e.age} />
        </div>
        <div>
          <label className={label}>Sexo</label>
          <select name="sex" className={field} defaultValue="">
            <option value="">—</option>
            <option value="F">F</option>
            <option value="M">M</option>
          </select>
        </div>
      </div>

      <hr className="border-gray-200" />
      <p className="text-sm text-gray-600">
        Para evitar reportes falsos, adjunta una prueba de identidad de la persona y deja
        tus datos de contacto. <strong>Esta información solo la ven los coordinadores.</strong>
      </p>

      <div>
        <label className={label}>Prueba de identidad (foto o PDF) *</label>
        <input
          name="proof"
          type="file"
          accept="image/*,application/pdf"
          className="mt-1 w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />
        <Err msg={e.proof} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Tu nombre *</label>
          <input name="submitterName" className={field} />
          <Err msg={e.submitterName} />
        </div>
        <div>
          <label className={label}>Tu contacto *</label>
          <input name="submitterContact" className={field} placeholder="Teléfono o correo" />
          <Err msg={e.submitterContact} />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Enviar reporte"}
        </button>
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
