import Link from "next/link";
import { createAnonClient } from "@/lib/supabase/anon";
import { searchRecords } from "@/lib/search";
import { RecordCard } from "@/app/components/RecordCard";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? await searchRecords(createAnonClient(), query) : [];

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sismo · Hospitales</h1>
        <p className="mt-1 text-sm text-gray-600">
          Busca a una persona ingresada tras el sismo por nombre o cédula.
        </p>
      </header>

      <form action="/" method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Nombre o cédula…"
          autoFocus
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-gray-500"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
        >
          Buscar
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/report" className="text-blue-700 hover:underline">
          + Reportar a una persona
        </Link>
        <Link href="/stats" className="text-gray-500 hover:underline">
          Estadísticas
        </Link>
      </div>

      <section className="mt-6 space-y-3">
        {query && results.length === 0 && (
          <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">
            No se encontraron resultados para <strong>{query}</strong>. Revisa la
            ortografía o{" "}
            <Link href="/report" className="text-blue-700 hover:underline">
              reporta a esta persona
            </Link>
            .
          </p>
        )}
        {results.map((r) => (
          <RecordCard key={r.id} record={r} />
        ))}
      </section>
    </main>
  );
}
