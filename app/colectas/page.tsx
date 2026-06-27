import Link from "next/link";
import { listColectas } from "@/lib/colectas-data";
import { Progress } from "@/components/colectas/Progress";
import { SessionBar } from "@/components/colectas/SessionBar";

export const dynamic = "force-dynamic";

export default async function ColectasPage() {
  const colectas = await listColectas();

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <SessionBar next="/colectas" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Colectas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Campañas de donación para la emergencia. Dona y registra tu aporte.
          </p>
        </div>
        <Link
          href="/colectas/nueva"
          className="shrink-0 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Crear colecta
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {colectas.length === 0 && (
          <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">
            Aún no hay colectas.{" "}
            <Link href="/colectas/nueva" className="text-blue-700 hover:underline">
              Crea la primera
            </Link>
            .
          </p>
        )}
        {colectas.map((c) => (
          <Link
            key={c.id}
            href={`/colectas/${c.id}`}
            className="block rounded-lg border border-gray-200 p-4 transition hover:border-gray-400 hover:shadow-sm"
          >
            <h3 className="font-semibold text-gray-900">{c.title}</h3>
            {c.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">{c.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Responsable: {c.admin_name}</p>
            <div className="mt-3">
              <Progress goal={c.goal_amount} total={c.totalRaised} currency={c.currency} />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
