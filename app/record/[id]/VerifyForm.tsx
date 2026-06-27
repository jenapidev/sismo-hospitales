"use client";

import { useActionState } from "react";
import { submitVerification, type VerifyState } from "@/app/actions/verify";

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-sm text-red-600">{msg}</p>;
}

export function VerifyForm({ recordId }: { recordId: string }) {
  const [state, action, pending] = useActionState<VerifyState, FormData>(
    submitVerification,
    {}
  );
  const e = state.errors ?? {};
  const field = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-500";
  const label = "block text-sm font-medium text-gray-700";

  if (state.ok) {
    return (
      <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
        ¡Gracias! Tu verificación fue registrada y será revisada por los coordinadores.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="recordId" value={recordId} />
      {e._form && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{e._form}</p>}

      <div>
        <label className={label}>¿Confirmas o disputas este registro? *</label>
        <div className="mt-1 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="claim" value="confirm" defaultChecked /> Confirmo que es
            correcto
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="claim" value="dispute" /> Está equivocado
          </label>
        </div>
        <Err msg={e.claim} />
      </div>

      <div>
        <label className={label}>Nota (opcional)</label>
        <textarea name="note" rows={2} className={field} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Tu nombre *</label>
          <input name="verifierName" className={field} />
          <Err msg={e.verifierName} />
        </div>
        <div>
          <label className={label}>Tu contacto *</label>
          <input name="verifierContact" className={field} placeholder="Teléfono o correo" />
          <Err msg={e.verifierContact} />
        </div>
      </div>

      <div>
        <label className={label}>Tu prueba de identidad (foto o PDF) *</label>
        <input
          name="proof"
          type="file"
          accept="image/*,application/pdf"
          className="mt-1 w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />
        <p className="mt-1 text-xs text-gray-500">Solo la ven los coordinadores.</p>
        <Err msg={e.proof} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Enviar verificación"}
      </button>
    </form>
  );
}
