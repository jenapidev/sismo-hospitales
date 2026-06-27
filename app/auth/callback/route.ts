import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/** Exchange the magic-link code for a session, then go to `next` (or the admin). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  // Only allow local-path redirects to avoid open-redirect abuse.
  const next = url.searchParams.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  return NextResponse.redirect(new URL(dest, url.origin));
}
