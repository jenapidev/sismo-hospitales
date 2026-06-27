import Link from "next/link";
import { notFound } from "next/navigation";
import { getCenter, listItems } from "@/lib/acopio-data";
import { CenterMapClient } from "@/components/acopio/CenterMapClient";

export const dynamic = "force-dynamic";

export default async function AcopioCenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const center = await getCenter(id);
  if (!center || center.hidden) notFound();
  const items = await listItems(id);
  const have = items.filter((i) => i.kind === "have");
  const need = items.filter((i) => i.kind === "need");

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <Link href="/acopio" className="text-sm text-gray-500 hover:underline">
        ← Centros de acopio
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{center.name}</h1>
        {center.verification_status === "coordinator_verified" && (
          <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
            Verificado
          </span>
        )}
      </div>

      {center.lat != null && center.lng != null && (
        <div className="mt-4">
          <CenterMapClient lat={center.lat} lng={center.lng} name={center.name} />
        </div>
      )}
      {center.address && <p className="mt-2 text-sm text-gray-700">{center.address}</p>}

      {center.aid_destination && (
        <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
          <span className="font-medium">Destino de la ayuda:</span> {center.aid_destination}
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-gray-400">Responsable</dt>
          <dd className="text-gray-900">
            {center.manager_name}
            {center.manager_cedula ? ` · ${center.manager_cedula}` : ""}
          </dd>
        </div>
        {center.org_name && (
          <div>
            <dt className="text-gray-400">Organización</dt>
            <dd className="text-gray-900">
              {center.org_name}
              {center.org_id ? ` · ${center.org_id}` : ""}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <InventoryList title="Tenemos" items={have} empty="Sin insumos registrados." />
        <InventoryList title="Necesitamos" items={need} empty="Sin necesidades registradas." />
      </div>

      <div className="mt-8 border-t border-gray-200 pt-4">
        <Link href={`/acopio/${id}/manage`} className="text-sm text-blue-700 hover:underline">
          ¿Eres el responsable? Gestionar este centro
        </Link>
      </div>
    </main>
  );
}

function InventoryList({
  title,
  items,
  empty,
}: {
  title: string;
  items: {
    id: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    category: string | null;
  }[];
  empty: string;
}) {
  return (
    <section>
      <h2 className="font-semibold text-gray-900">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-gray-400">{empty}</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm text-gray-700">
          {items.map((i) => (
            <li key={i.id} className="flex items-baseline justify-between gap-2">
              <span>
                {i.name}
                {i.category && (
                  <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    {i.category}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-gray-500">
                {i.quantity != null ? i.quantity : ""} {i.unit ?? ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
