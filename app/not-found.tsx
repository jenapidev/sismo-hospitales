import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl p-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Página no encontrada</h1>
      <p className="mt-2 text-gray-600">
        No encontramos lo que buscas.
      </p>
      <Link href="/" className="mt-4 inline-block text-blue-700 hover:underline">
        ← Volver al inicio
      </Link>
    </main>
  );
}
