import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { listColectasByOwner } from "@/lib/colectas-data";
import { Progress } from "@/components/colectas/Progress";
import { SessionBar } from "@/components/colectas/SessionBar";

export const dynamic = "force-dynamic";

export default async function MisColectasPage() {
  const user = await getUser();
  if (!user) redirect("/colectas/login?next=/colectas/mias");
  const colectas = await listColectasByOwner(user.id);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <SessionBar next="/colectas/mias" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/colectas" className="text-sm text-gray-500 hover:underline">
            ← Colectas
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Mis colectas</h1>
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
            Todavía no tienes colectas.{" "}
            <Link href="/colectas/nueva" className="text-blue-700 hover:underline">
              Crea una
            </Link>
            .
          </p>
        )}
        {colectas.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-gray-900">{c.title}</h3>
              <Link
                href={`/colectas/${c.id}/gestionar`}
                className="shrink-0 text-sm text-blue-700 hover:underline"
              >
                Gestionar
              </Link>
            </div>
            <div className="mt-3">
              <Progress goal={c.goal_amount} total={c.totalRaised} currency={c.currency} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
