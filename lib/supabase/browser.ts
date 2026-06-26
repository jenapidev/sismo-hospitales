import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";

/** Anon client for Client Components. Subject to RLS. */
export function createBrowserClient() {
  return createSsrBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
