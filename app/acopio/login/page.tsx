import Link from "next/link";
import { LoginForm } from "@/app/admin/login/LoginForm";

export const dynamic = "force-dynamic";

export default function AcopioLoginPage() {
  return (
    <main className="mx-auto max-w-sm p-6">
      <Link href="/acopio" className="text-sm text-gray-500 hover:underline">
        ← Centros de acopio
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">Acceso de responsables</h1>
      <p className="mt-1 mb-5 text-sm text-gray-600">
        Inicia sesión con tu correo y contraseña para registrar o gestionar un centro de acopio.
      </p>
      <LoginForm next="/acopio/nuevo" />
    </main>
  );
}
