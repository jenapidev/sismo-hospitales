"use client";

import { useState } from "react";
import { addAccount, deleteAccount } from "@/app/actions/colectas";
import { methodLabel } from "@/lib/colectas-format";
import type { AccountRow } from "@/lib/colectas-data";
import type { AccountMethod } from "@/lib/colectas";

const field = "rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500";

export function AccountsEditor({ colectaId, accounts }: { colectaId: string; accounts: AccountRow[] }) {
  const [method, setMethod] = useState<AccountMethod>("pago_movil");

  return (
    <div>
      <ul className="space-y-2">
        {accounts.length === 0 && <li className="text-sm text-gray-400">Sin cuentas todavía.</li>}
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 p-2 text-sm">
            <span className="text-gray-700">
              <span className="font-medium">{methodLabel(a.method)}</span>{" "}
              {a.method === "pago_movil"
                ? `· ${a.bank_entity} · ${a.phone} · ${a.cedula}`
                : `· ${a.email} · ${a.owner_name}`}
            </span>
            <form action={deleteAccount}>
              <input type="hidden" name="colectaId" value={colectaId} />
              <input type="hidden" name="accountId" value={a.id} />
              <button type="submit" className="text-xs text-red-600 hover:underline">
                quitar
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={addAccount} className="mt-3 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
        <input type="hidden" name="colectaId" value={colectaId} />
        <div>
          <label className="block text-xs text-gray-500">Método</label>
          <select
            name="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as AccountMethod)}
            className={field}
          >
            <option value="pago_movil">Pago móvil</option>
            <option value="bizum">Bizum</option>
            <option value="zelle">Zelle</option>
          </select>
        </div>

        {method === "pago_movil" ? (
          <>
            <input name="phone" placeholder="Teléfono" className={`${field} w-32`} />
            <input name="bankEntity" placeholder="Banco" className={`${field} w-32`} />
            <input name="cedula" placeholder="Cédula" className={`${field} w-32`} />
          </>
        ) : (
          <>
            <input name="email" placeholder="Correo" className={`${field} w-44`} />
            <input name="ownerName" placeholder="Titular" className={`${field} w-32`} />
          </>
        )}

        <button type="submit" className="rounded bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700">
          Agregar cuenta
        </button>
      </form>
    </div>
  );
}
