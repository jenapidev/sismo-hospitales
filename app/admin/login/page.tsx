import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto max-w-sm p-6">
      <Link href="/" className="text-sm text-gray-500 hover:underline">
        ← Inicio
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">Acceso de coordinadores</h1>
      <p className="mt-1 mb-5 text-sm text-gray-600">
        Solo para coordinadores autorizados. Inicia sesión con tu correo y contraseña.
      </p>
      <LoginForm next="/admin" />
    </main>
  );
}
