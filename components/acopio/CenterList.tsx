"use client";

import { useState } from "react";
import Link from "next/link";
import type { CenterWithCounts } from "@/lib/acopio-data";

export function CenterList({ centers }: { centers: CenterWithCounts[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? centers.filter((c) => c.name.toLowerCase().includes(needle))
    : centers;

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtrar por nombre…"
        className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
      />
      <div className="space-y-3">
        {shown.length === 0 && (
          <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">
            No hay centros que coincidan.
          </p>
        )}
        {shown.map((c) => (
          <Link
            key={c.id}
            href={`/acopio/${c.id}`}
            className="block rounded-lg border border-gray-200 p-4 transition hover:border-gray-400 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-gray-900">{c.name}</h3>
              {c.verification_status === "coordinator_verified" && (
                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Verificado
                </span>
              )}
            </div>
            {c.address && <p className="mt-1 text-sm text-gray-600">{c.address}</p>}
            <p className="mt-2 text-xs text-gray-500">
              Tiene {c.haveCount} · Necesita {c.needCount}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
