"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

/** Sign the current user out and redirect (defaults to /colectas). */
export async function signOut(fd: FormData) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/") ? next : "/colectas");
}
