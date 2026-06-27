import Link from "next/link";
import { notFound } from "next/navigation";
import { getColecta, listAccounts, listDonaciones, colectaTotals } from "@/lib/colectas-data";
import { getBcvRates, usdView } from "@/lib/rates";
import { Progress } from "@/components/colectas/Progress";
import { DonateForm } from "@/components/colectas/DonateForm";
import { methodLabel, money, STATUS_LABEL, STATUS_BADGE } from "@/lib/colectas-format";

export const dynamic = "force-dynamic";

export default async function ColectaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const colecta = await getColecta(id);
  if (!colecta || colecta.hidden) notFound();
  const [accounts, donaciones, rates] = await Promise.all([
    listAccounts(id),
    listDonaciones(id),
    getBcvRates(),
  ]);
  const totals = colectaTotals(donaciones);
  const { goalUsd, totalUsd } = usdView(colecta.goal_amount, colecta.currency, totals, rates);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <Link href="/colectas" className="text-sm text-gray-500 hover:underline">
        ← Colectas
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{colecta.title}</h1>
      {colecta.description && <p className="mt-2 text-gray-700">{colecta.description}</p>}

      <div className="mt-4">
        <Progress goalUsd={goalUsd} totalUsd={totalUsd} received={totals} />
      </div>

      <p className="mt-3 text-sm text-gray-500">
        Responsable: {colecta.admin_name} · {colecta.admin_cedula} · {colecta.admin_email}
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Cómo donar</h2>
        {accounts.length === 0 ? (
          <p className="mt-1 text-sm text-gray-400">El responsable aún no agregó cuentas.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {accounts.map((a) => (
              <li key={a.id} className="rounded-md border border-gray-200 p-3 text-sm">
                <div className="font-medium text-gray-900">{methodLabel(a.method)}</div>
                {a.method === "pago_movil" ? (
                  <div className="text-gray-600">
                    Banco: {a.bank_entity} · Teléfono: {a.phone} · Cédula: {a.cedula}
                  </div>
                ) : (
                  <div className="text-gray-600">
                    Correo: {a.email} · Titular: {a.owner_name}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900">Registrar mi donación</h2>
        <p className="mt-1 mb-4 text-sm text-gray-600">
          Adjunta el comprobante. Quedará pendiente hasta que el responsable la confirme.
        </p>
        <DonateForm colectaId={colecta.id} currency={colecta.currency} accounts={accounts} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Donaciones ({donaciones.length})</h2>
        {donaciones.length === 0 ? (
          <p className="mt-1 text-sm text-gray-400">Aún no hay donaciones.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100">
            {donaciones.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-700">
                  {d.donor_name || "Anónimo"} —{" "}
                  <strong>{d.amount != null ? money(d.amount, d.currency) : "—"}</strong>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[d.status]}`}>
                  {STATUS_LABEL[d.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 border-t border-gray-200 pt-4">
        <Link href={`/colectas/${id}/gestionar`} className="text-sm text-blue-700 hover:underline">
          ¿Eres el responsable? Gestionar esta colecta
        </Link>
      </div>
    </main>
  );
}
