import { createServerClient as createSsrClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cookie-aware anon client for Server Components / Route Handlers. Used for
 * coordinator auth sessions and any anon-scoped reads. Subject to RLS.
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  return createSsrClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component (read-only cookies). Safe to ignore;
            // session refresh is handled by middleware / route handlers.
          }
        },
      },
    }
  );
}
