"use client";

import { useState } from "react";
import Link from "next/link";
import { ITEM_CATEGORIES } from "@/lib/acopio";
import type { CenterWithCounts } from "@/lib/acopio-data";
import { DirectoryMapClient } from "./DirectoryMapClient";

type Tipo = "todos" | "tienen" | "necesitan";

export function AcopioBrowser({ centers }: { centers: CenterWithCounts[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [tipo, setTipo] = useState<Tipo>("todos");

  const needle = q.trim().toLowerCase();
  const shown = centers.filter((c) => {
    if (needle && !c.name.toLowerCase().includes(needle)) return false;
    if (category) {
      const inHave = c.haveCategories.includes(category);
      const inNeed = c.needCategories.includes(category);
      if (tipo === "tienen" && !inHave) return false;
      if (tipo === "necesitan" && !inNeed) return false;
      if (tipo === "todos" && !inHave && !inNeed) return false;
    }
    return true;
  });

  const select = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500";

  return (
    <div>
      <DirectoryMapClient
        centers={shown.map((c) => ({ id: c.id, name: c.name, lat: c.lat, lng: c.lng }))}
      />

      <div className="mt-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por nombre…"
          className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={select}>
            <option value="">Todas las categorías</option>
            {ITEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Tipo)}
            disabled={!category}
            className={`${select} disabled:opacity-50`}
          >
            <option value="todos">Tienen o necesitan</option>
            <option value="tienen">Tienen</option>
            <option value="necesitan">Necesitan</option>
          </select>
          {(category || needle) && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setCategory("");
                setTipo("todos");
              }}
              className="text-sm text-gray-500 hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <p className="mb-2 mt-3 text-xs text-gray-400">{shown.length} centro(s)</p>

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
