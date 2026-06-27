import Link from "next/link";
import { getUser } from "@/lib/auth";
import { signOut } from "@/app/actions/session";

/**
 * Compact session bar for the colectas area: shows the logged-in email with
 * links to "Mis colectas" and logout, or a sign-in link when logged out.
 */
export async function SessionBar({ next = "/colectas" }: { next?: string }) {
  const user = await getUser();

  if (!user) {
    return (
      <div className="mb-4 flex items-center justify-end text-sm">
        <Link
          href={`/colectas/login?next=${encodeURIComponent(next)}`}
          className="text-blue-700 hover:underline"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
      <span className="text-gray-500">{user.email}</span>
      <Link href="/colectas/mias" className="text-blue-700 hover:underline">
        Mis colectas
      </Link>
      <form action={signOut}>
        <input type="hidden" name="next" value="/colectas" />
        <button type="submit" className="text-gray-500 hover:underline">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
