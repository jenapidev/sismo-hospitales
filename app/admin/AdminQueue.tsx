"use client";

import { useState, useTransition } from "react";
import {
  setVerified,
  setDisputed,
  clearReview,
  hideRecord,
  mergeDuplicates,
  getSignedProofUrl,
} from "@/app/actions/moderate";
import { STATUS_LABELS, VERIFICATION_LABELS } from "@/lib/labels";
import type { Status, VerificationStatus } from "@/lib/types";

export interface QueueRow {
  id: string;
  fullName: string;
  cedula: string | null;
  hospitalName: string;
  status: string;
  verificationStatus: string;
  needsReview: boolean;
  source: string;
  proofPath: string | null;
  submitterName: string | null;
  submitterContact: string | null;
  duplicateGroup: string | null;
}

function ProofButton({ path }: { path: string | null }) {
  const [pending, start] = useTransition();
  if (!path) return <span className="text-xs text-gray-400">sin prueba</span>;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const url = await getSignedProofUrl(path);
          if (url) window.open(url, "_blank", "noopener");
        })
      }
      className="text-xs text-blue-700 underline disabled:opacity-50"
    >
      {pending ? "…" : "ver prueba"}
    </button>
  );
}

function ActionButton({
  action,
  recordId,
  children,
  className,
}: {
  action: (fd: FormData) => Promise<void>;
  recordId: string;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="recordId" value={recordId} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}

function RowMeta({ row }: { row: QueueRow }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{row.fullName}</span>
        {row.cedula && <span>{row.cedula}</span>}
        <span>{row.hospitalName}</span>
        <span>{STATUS_LABELS[row.status as Status] ?? row.status}</span>
        <span className="text-gray-400">
          {VERIFICATION_LABELS[row.verificationStatus as VerificationStatus] ?? row.verificationStatus}
        </span>
      </div>
      {(row.submitterName || row.submitterContact || row.proofPath) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
          {row.submitterName && <span>Reportó: {row.submitterName}</span>}
          {row.submitterContact && <span>{row.submitterContact}</span>}
          <ProofButton path={row.proofPath} />
        </div>
      )}
    </>
  );
}

export function AdminQueue({ queue, dupes }: { queue: QueueRow[]; dupes: QueueRow[] }) {
  const groups = new Map<string, QueueRow[]>();
  for (const r of dupes) {
    if (!r.duplicateGroup) continue;
    const g = groups.get(r.duplicateGroup);
    if (g) g.push(r);
    else groups.set(r.duplicateGroup, [r]);
  }

  const okBtn = "rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700";
  const warnBtn = "rounded bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700";
  const grayBtn = "rounded bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300";
  const redBtn = "rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700";

  return (
    <>
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Cola de revisión ({queue.length})
        </h2>
        <p className="text-sm text-gray-500">
          Registros marcados para revisar o en disputa.
        </p>
        <div className="mt-3 space-y-3">
          {queue.length === 0 && (
            <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">
              Nada pendiente. 🎉
            </p>
          )}
          {queue.map((row) => (
            <div key={row.id} className="rounded-lg border border-gray-200 p-3">
              <RowMeta row={row} />
              <div className="mt-2 flex flex-wrap gap-2">
                <ActionButton action={setVerified} recordId={row.id} className={okBtn}>
                  Verificar
                </ActionButton>
                <ActionButton action={setDisputed} recordId={row.id} className={warnBtn}>
                  Marcar disputa
                </ActionButton>
                <ActionButton action={clearReview} recordId={row.id} className={grayBtn}>
                  Marcar revisado
                </ActionButton>
                <ActionButton action={hideRecord} recordId={row.id} className={redBtn}>
                  Ocultar
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Posibles duplicados ({groups.size})
        </h2>
        <p className="text-sm text-gray-500">
          Misma persona en más de un hospital. Conserva un registro; los demás se ocultan.
        </p>
        <div className="mt-3 space-y-3">
          {groups.size === 0 && (
            <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">Ninguno.</p>
          )}
          {[...groups.entries()].map(([groupId, rows]) => (
            <div key={groupId} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between border-b border-amber-100 py-1 last:border-0"
                >
                  <span className="text-sm text-gray-700">
                    {row.fullName} · {row.hospitalName}
                  </span>
                  <form action={mergeDuplicates}>
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="keepId" value={row.id} />
                    <button type="submit" className={grayBtn}>
                      Conservar este
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
