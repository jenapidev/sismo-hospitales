import Link from "next/link";
import { createAnonClient } from "@/lib/supabase/anon";
import { searchRecords } from "@/lib/search";
import { RecordCard } from "@/app/components/RecordCard";
import { LangToggle } from "@/app/components/LangToggle";
import { dict, getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? await searchRecords(createAnonClient(), query) : [];
  const locale = await getLocale();
  const t = dict(locale);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-6">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <LangToggle locale={locale} />
        </div>
        <p className="mt-1 text-sm text-gray-600">{t.tagline}</p>
      </header>

      <form action="/" method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t.searchPlaceholder}
          autoFocus
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-gray-500"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
        >
          {t.search}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Link href="/report" className="text-blue-700 hover:underline">
          {t.report}
        </Link>
        <Link href="/acopio" className="text-blue-700 hover:underline">
          {t.acopio}
        </Link>
        <Link href="/stats" className="ml-auto text-gray-500 hover:underline">
          {t.stats}
        </Link>
      </div>

      <section className="mt-6 space-y-3">
        {query && results.length === 0 && (
          <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">
            {t.noResults} <strong>{query}</strong>.{" "}
            <Link href="/report" className="text-blue-700 hover:underline">
              {t.orReport}
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
