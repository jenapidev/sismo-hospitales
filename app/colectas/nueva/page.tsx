import Link from "next/link";
import { getUser } from "@/lib/auth";
import { createColecta } from "@/app/actions/colectas";
import { ColectaForm } from "@/components/colectas/ColectaForm";
import { SessionBar } from "@/components/colectas/SessionBar";

export const dynamic = "force-dynamic";

export default async function NuevaColectaPage() {
  const user = await getUser();

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <SessionBar next="/colectas/nueva" />
      <Link href="/colectas" className="text-sm text-gray-500 hover:underline">
        ← Colectas
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Crear una colecta</h1>

      {!user ? (
        <div className="mt-4 rounded-md bg-gray-50 p-4 text-sm text-gray-700">
          Para crear una colecta necesitas iniciar sesión con tu correo.{" "}
          <Link href="/colectas/login?next=/colectas/nueva" className="text-blue-700 hover:underline">
            Iniciar sesión
          </Link>
          .
        </div>
      ) : (
        <div className="mt-4">
          <ColectaForm action={createColecta} submitLabel="Crear colecta" />
        </div>
      )}
    </main>
  );
}
