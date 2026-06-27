import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCenter, listItems } from "@/lib/acopio-data";
import { getUser, canManageCenter, isCoordinatorEmail } from "@/lib/auth";
import { updateCenter, verifyCenter, hideCenter } from "@/app/actions/acopio";
import { CenterForm } from "@/components/acopio/CenterForm";
import { InventoryEditor } from "@/components/acopio/InventoryEditor";

export const dynamic = "force-dynamic";

export default async function ManageCenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const center = await getCenter(id);
  if (!center) notFound();

  const user = await getUser();
  if (!canManageCenter(user, { owner_user_id: center.owner_user_id })) {
    redirect(`/acopio/${id}`);
  }
  const isCoord = isCoordinatorEmail(user?.email, process.env.COORDINATOR_EMAILS ?? "");
  const items = await listItems(id);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <Link href={`/acopio/${id}`} className="text-sm text-gray-500 hover:underline">
        ← Ver centro
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Gestionar centro</h1>

      <section className="mt-5">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Datos del centro</h2>
        <CenterForm
          action={updateCenter}
          submitLabel="Guardar cambios"
          defaults={{
            centerId: center.id,
            name: center.name,
            address: center.address ?? "",
            lat: center.lat,
            lng: center.lng,
            managerName: center.manager_name,
            managerCedula: center.manager_cedula,
            orgName: center.org_name,
            orgId: center.org_id,
            aidDestination: center.aid_destination,
          }}
        />
      </section>

      <section className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Inventario</h2>
        <InventoryEditor centerId={center.id} items={items} />
      </section>

      {isCoord && (
        <section className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Moderación (coordinador)</h2>
          <div className="flex gap-2">
            <form action={verifyCenter}>
              <input type="hidden" name="centerId" value={center.id} />
              <button className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">
                Verificar centro
              </button>
            </form>
            <form action={hideCenter}>
              <input type="hidden" name="centerId" value={center.id} />
              <button className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
                Ocultar centro
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
