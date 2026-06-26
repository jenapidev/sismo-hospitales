import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/** Exchange the magic-link code for a session, then go to the admin dashboard. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/admin", url.origin));
}
