import { createAnonClient } from "@/lib/supabase/anon";
import { ReportForm } from "./ReportForm";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const supabase = createAnonClient();
  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("id,name")
    .order("name");

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportar a una persona</h1>
        <p className="mt-1 text-sm text-gray-600">
          El reporte aparecerá de inmediato como <strong>no verificado</strong>. La
          comunidad y los coordinadores podrán confirmarlo.
        </p>
      </header>
      <ReportForm hospitals={hospitals ?? []} />
    </main>
  );
}
