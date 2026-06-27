import Link from "next/link";
import { getUser } from "@/lib/auth";
import { createCenter } from "@/app/actions/acopio";
import { CenterForm } from "@/components/acopio/CenterForm";

export const dynamic = "force-dynamic";

export default async function NuevoAcopioPage() {
  const user = await getUser();

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <Link href="/acopio" className="text-sm text-gray-500 hover:underline">
        ← Centros de acopio
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Registrar un centro de acopio</h1>

      {!user ? (
        <div className="mt-4 rounded-md bg-gray-50 p-4 text-sm text-gray-700">
          Para registrar un centro necesitas iniciar sesión con tu correo.{" "}
          <Link href="/acopio/login" className="text-blue-700 hover:underline">
            Iniciar sesión
          </Link>
          .
        </div>
      ) : (
        <div className="mt-4">
          <CenterForm action={createCenter} submitLabel="Registrar centro" />
        </div>
      )}
    </main>
  );
}
