import Link from "next/link";
import { createAnonClient } from "@/lib/supabase/anon";
import { summarize, type StatsRow } from "@/lib/stats";
import { STATUS_LABELS } from "@/lib/labels";
import type { Status } from "@/lib/types";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchAllRows(supabase: any): Promise<StatsRow[]> {
  const rows: StatsRow[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from("records_public")
      .select("hospital_id,status,verification_status,needs_review,duplicate_group")
      .range(from, from + size - 1);
    if (error) throw new Error(error.message);
    for (const r of data ?? [])
      rows.push({
        hospitalId: r.hospital_id,
        status: r.status,
        verificationStatus: r.verification_status,
        needsReview: r.needs_review,
        duplicateGroup: r.duplicate_group,
      });
    if (!data || data.length < size) break;
  }
  return rows;
}

function freshness(iso: string | null): string {
  if (!iso) return "sin sincronizar aún";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "hace instantes";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  return `hace ${h} h`;
}

export default async function StatsPage() {
  const supabase = createAnonClient();
  const [{ data: hospitals }, rows, { data: lastRun }] = await Promise.all([
    supabase.from("hospitals").select("id,name"),
    fetchAllRows(supabase),
    supabase
      .from("sync_runs")
      .select("finished_at,status")
      .like("status", "ok%")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const stats = summarize(rows, hospitals ?? []);
  const { overall } = stats;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <Link href="/" className="text-sm text-gray-500 hover:underline">
        ← Volver a la búsqueda
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Estadísticas</h1>
      <p className="mt-1 text-sm text-gray-500">
        Última actualización de datos: {freshness(lastRun?.finished_at ?? null)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Personas" value={overall.total} />
        <Stat label="Verificadas" value={overall.byVerification.coordinator_verified + overall.byVerification.community_confirmed} />
        <Stat label="Por revisar" value={overall.needsReview} />
        <Stat label="Posibles duplicados" value={overall.duplicates} />
      </div>

      {overall.duplicates > 0 && (
        <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          ⚠️ {overall.duplicates} registros podrían ser la misma persona en más de un
          hospital. Los coordinadores los revisan en la cola de moderación.
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold text-gray-900">Por estado</h2>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        {(Object.keys(overall.byStatus) as Status[]).map((s) => (
          <span key={s} className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
            {STATUS_LABELS[s]}: <strong>{overall.byStatus[s]}</strong>
          </span>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">Por hospital</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="py-2 pr-3">Hospital</th>
              <th className="px-2">Personas</th>
              <th className="px-2">Verif.</th>
              <th className="px-2">Por revisar</th>
            </tr>
          </thead>
          <tbody>
            {stats.perHospital.map((h) => (
              <tr key={h.hospitalId} className="border-b border-gray-100">
                <td className="py-2 pr-3 text-gray-900">{h.name}</td>
                <td className="px-2">{h.total}</td>
                <td className="px-2">
                  {h.byVerification.coordinator_verified + h.byVerification.community_confirmed}
                </td>
                <td className="px-2">{h.needsReview}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
