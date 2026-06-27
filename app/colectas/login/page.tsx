import Link from "next/link";
import { LoginForm } from "@/app/admin/login/LoginForm";

export const dynamic = "force-dynamic";

export default function ColectaLoginPage() {
  return (
    <main className="mx-auto max-w-sm p-6">
      <Link href="/colectas" className="text-sm text-gray-500 hover:underline">
        ← Colectas
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">Acceso de responsables</h1>
      <p className="mt-1 mb-5 text-sm text-gray-600">
        Inicia sesión con tu correo para crear o gestionar una colecta.
      </p>
      <LoginForm next="/colectas/nueva" />
    </main>
  );
}
