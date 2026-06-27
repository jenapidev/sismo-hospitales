"use client";

import { addItem, deleteItem } from "@/app/actions/acopio";
import type { AcopioItem } from "@/lib/acopio-data";

function Column({
  centerId,
  kind,
  title,
  items,
}: {
  centerId: string;
  kind: "have" | "need";
  title: string;
  items: AcopioItem[];
}) {
  const field = "rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500";
  return (
    <section>
      <h3 className="font-semibold text-gray-900">{title}</h3>

      <ul className="mt-2 space-y-1">
        {items.length === 0 && <li className="text-sm text-gray-400">Vacío.</li>}
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-gray-700">
              {i.name}
              {i.quantity != null ? ` — ${i.quantity}` : ""} {i.unit ?? ""}
            </span>
            <form action={deleteItem}>
              <input type="hidden" name="centerId" value={centerId} />
              <input type="hidden" name="itemId" value={i.id} />
              <button type="submit" className="text-xs text-red-600 hover:underline">
                quitar
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={addItem} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="centerId" value={centerId} />
        <input type="hidden" name="kind" value={kind} />
        <input name="name" placeholder="Insumo" required className={`${field} flex-1 min-w-[8rem]`} />
        <input name="quantity" placeholder="Cant." inputMode="numeric" className={`${field} w-16`} />
        <input name="unit" placeholder="Unidad" className={`${field} w-20`} />
        <button
          type="submit"
          className="rounded bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700"
        >
          Agregar
        </button>
      </form>
    </section>
  );
}

export function InventoryEditor({ centerId, items }: { centerId: string; items: AcopioItem[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Column centerId={centerId} kind="have" title="Tenemos" items={items.filter((i) => i.kind === "have")} />
      <Column centerId={centerId} kind="need" title="Necesitamos" items={items.filter((i) => i.kind === "need")} />
    </div>
  );
}
