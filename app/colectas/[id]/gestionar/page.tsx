import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getColecta, listAccounts, listDonaciones } from "@/lib/colectas-data";
import { getUser, canManageColecta } from "@/lib/auth";
import { updateColecta, deleteColecta } from "@/app/actions/colectas";
import { ColectaForm } from "@/components/colectas/ColectaForm";
import { AccountsEditor } from "@/components/colectas/AccountsEditor";
import { DonationsReview } from "@/components/colectas/DonationsReview";
import { SessionBar } from "@/components/colectas/SessionBar";

export const dynamic = "force-dynamic";

export default async function GestionarColectaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const colecta = await getColecta(id);
  if (!colecta) notFound();

  const user = await getUser();
  if (!canManageColecta(user, { owner_user_id: colecta.owner_user_id })) {
    redirect(`/colectas/${id}`);
  }
  const [accounts, donaciones] = await Promise.all([listAccounts(id), listDonaciones(id)]);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <SessionBar next={`/colectas/${id}/gestionar`} />
      <Link href={`/colectas/${id}`} className="text-sm text-gray-500 hover:underline">
        ← Ver colecta
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Gestionar colecta</h1>

      <section className="mt-5">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Datos</h2>
        <ColectaForm
          action={updateColecta}
          submitLabel="Guardar cambios"
          defaults={{
            colectaId: colecta.id,
            title: colecta.title,
            description: colecta.description,
            goalAmount: colecta.goal_amount,
            currency: colecta.currency,
            adminName: colecta.admin_name,
            adminCedula: colecta.admin_cedula,
            adminEmail: colecta.admin_email,
          }}
        />
      </section>

      <section className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Cuentas para donar</h2>
        <AccountsEditor colectaId={colecta.id} accounts={accounts} />
      </section>

      <section className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Donaciones</h2>
        <DonationsReview donaciones={donaciones} />
      </section>

      <section className="mt-8 border-t border-gray-200 pt-6">
        <form action={deleteColecta}>
          <input type="hidden" name="colectaId" value={colecta.id} />
          <button className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
            Eliminar colecta
          </button>
        </form>
      </section>
    </main>
  );
}
