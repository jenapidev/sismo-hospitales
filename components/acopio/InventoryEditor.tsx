"use client";

import { addItem, updateItem, deleteItem } from "@/app/actions/acopio";
import { ITEM_CATEGORIES } from "@/lib/acopio";
import type { AcopioItem } from "@/lib/acopio-data";

const field = "rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500";

function CategorySelect({ value }: { value?: string | null }) {
  return (
    <select name="category" defaultValue={value ?? ""} className={`${field} w-28`}>
      <option value="">Categoría…</option>
      {ITEM_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

function ItemRow({ centerId, item }: { centerId: string; item: AcopioItem }) {
  return (
    <li className="flex flex-wrap items-center gap-2">
      <form action={updateItem} className="flex flex-1 flex-wrap items-center gap-2">
        <input type="hidden" name="centerId" value={centerId} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="kind" value={item.kind} />
        <input name="name" defaultValue={item.name} className={`${field} flex-1 min-w-[7rem]`} />
        <input
          name="quantity"
          defaultValue={item.quantity ?? ""}
          inputMode="numeric"
          placeholder="Cant."
          className={`${field} w-16`}
        />
        <input name="unit" defaultValue={item.unit ?? ""} placeholder="Unidad" className={`${field} w-20`} />
        <CategorySelect value={item.category} />
        <button type="submit" className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300">
          Guardar
        </button>
      </form>
      <form action={deleteItem}>
        <input type="hidden" name="centerId" value={centerId} />
        <input type="hidden" name="itemId" value={item.id} />
        <button type="submit" className="text-xs text-red-600 hover:underline">
          quitar
        </button>
      </form>
    </li>
  );
}

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
  return (
    <section>
      <h3 className="font-semibold text-gray-900">{title}</h3>

      <ul className="mt-2 space-y-2">
        {items.length === 0 && <li className="text-sm text-gray-400">Vacío.</li>}
        {items.map((i) => (
          <ItemRow key={i.id} centerId={centerId} item={i} />
        ))}
      </ul>

      <form action={addItem} className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
        <input type="hidden" name="centerId" value={centerId} />
        <input type="hidden" name="kind" value={kind} />
        <input name="name" placeholder="Nuevo insumo" required className={`${field} flex-1 min-w-[7rem]`} />
        <input name="quantity" placeholder="Cant." inputMode="numeric" className={`${field} w-16`} />
        <input name="unit" placeholder="Unidad" className={`${field} w-20`} />
        <CategorySelect />
        <button type="submit" className="rounded bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700">
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
