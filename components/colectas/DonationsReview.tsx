"use client";

import { useTransition } from "react";
import {
  confirmDonacion,
  rejectDonacion,
  deleteDonacion,
  getDonacionProofUrl,
} from "@/app/actions/colectas";
import { money, STATUS_LABEL, STATUS_BADGE } from "@/lib/colectas-format";
import type { DonacionRow } from "@/lib/colectas-data";

function ProofButton({ donacionId }: { donacionId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const url = await getDonacionProofUrl(donacionId);
          if (url) window.open(url, "_blank", "noopener");
        })
      }
      className="text-xs text-blue-700 underline disabled:opacity-50"
    >
      {pending ? "…" : "ver comprobante"}
    </button>
  );
}

export function DonationsReview({ donaciones }: { donaciones: DonacionRow[] }) {
  if (donaciones.length === 0) {
    return <p className="text-sm text-gray-400">Aún no hay donaciones.</p>;
  }
  const btn = "rounded px-2 py-1 text-xs font-medium";
  return (
    <ul className="space-y-2">
      {donaciones.map((d) => (
        <li key={d.id} className="rounded-md border border-gray-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-gray-700">
              {d.donor_name || "Anónimo"} —{" "}
              <strong>{d.amount != null ? money(d.amount, d.currency) : "—"}</strong>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[d.status]}`}>
              {STATUS_LABEL[d.status]}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProofButton donacionId={d.id} />
            {d.status !== "confirmed" && (
              <form action={confirmDonacion}>
                <input type="hidden" name="donacionId" value={d.id} />
                <button className={`${btn} bg-green-600 text-white hover:bg-green-700`}>Confirmar</button>
              </form>
            )}
            {d.status !== "rejected" && (
              <form action={rejectDonacion}>
                <input type="hidden" name="donacionId" value={d.id} />
                <button className={`${btn} bg-amber-600 text-white hover:bg-amber-700`}>Rechazar</button>
              </form>
            )}
            <form action={deleteDonacion}>
              <input type="hidden" name="donacionId" value={d.id} />
              <button className={`${btn} bg-gray-200 text-gray-700 hover:bg-gray-300`}>Eliminar</button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
