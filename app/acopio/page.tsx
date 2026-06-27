import Link from "next/link";
import { listCenters } from "@/lib/acopio-data";
import { AcopioBrowser } from "@/components/acopio/AcopioBrowser";

export const dynamic = "force-dynamic";

export default async function AcopioPage() {
  const centers = await listCenters();

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centros de acopio</h1>
          <p className="mt-1 text-sm text-gray-600">
            Encuentra dónde donar o pedir insumos tras el sismo.
          </p>
        </div>
        <Link
          href="/acopio/nuevo"
          className="shrink-0 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Registrar centro
        </Link>
      </div>

      <div className="mt-5">
        {centers.length === 0 ? (
          <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">
            Aún no hay centros registrados.{" "}
            <Link href="/acopio/nuevo" className="text-blue-700 hover:underline">
              Registra el primero
            </Link>
            .
          </p>
        ) : (
          <AcopioBrowser centers={centers} />
        )}
      </div>
    </main>
  );
}
