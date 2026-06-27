"use client";

import { useActionState } from "react";
import { submitDonacion, type DonacionState } from "@/app/actions/colectas";
import { accountLabel } from "@/lib/colectas-format";
import type { AccountRow } from "@/lib/colectas-data";

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-sm text-red-600">{msg}</p>;
}

export function DonateForm({
  colectaId,
  currency,
  accounts,
}: {
  colectaId: string;
  currency: string;
  accounts: AccountRow[];
}) {
  const [state, action, pending] = useActionState<DonacionState, FormData>(submitDonacion, {});
  const e = state.errors ?? {};
  const field = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-500";
  const label = "block text-sm font-medium text-gray-700";

  if (state.ok) {
    return (
      <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
        ¡Gracias! Tu donación quedó registrada como <strong>pendiente</strong>. El
        responsable la confirmará al revisar el comprobante.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="colectaId" value={colectaId} />
      {e._form && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{e._form}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Monto *</label>
          <input name="amount" inputMode="decimal" className={field} />
          <Err msg={e.amount} />
        </div>
        <div>
          <label className={label}>Moneda</label>
          <select name="currency" defaultValue={currency} className={field}>
            <option value="Bs">Bs</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Tu nombre (opcional)</label>
        <input name="donorName" className={field} placeholder="Puedes donar de forma anónima" />
      </div>

      {accounts.length > 0 && (
        <div>
          <label className={label}>¿A qué cuenta enviaste?</label>
          <select name="accountId" defaultValue="" className={field}>
            <option value="">No especificar</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {accountLabel(a)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={label}>Comprobante (foto o PDF) *</label>
        <input
          name="proof"
          type="file"
          accept="image/*,application/pdf"
          className="mt-1 w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />
        <p className="mt-1 text-xs text-gray-500">Solo lo ve el responsable de la colecta.</p>
        <Err msg={e.proof} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Registrar donación"}
      </button>
    </form>
  );
}
