import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

/** True if `email` is in the comma-separated allowlist (case-insensitive). */
export function isCoordinatorEmail(email: string | null | undefined, list: string): boolean {
  if (!email || !list) return false;
  const target = email.trim().toLowerCase();
  return list
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(target);
}

/** The logged-in user if they are a coordinator, else null. */
export async function getCoordinator() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return isCoordinatorEmail(user.email, process.env.COORDINATOR_EMAILS ?? "") ? user : null;
}

/** Redirects to login if the visitor is not a coordinator. */
export async function requireCoordinator() {
  const user = await getCoordinator();
  if (!user) redirect("/admin/login");
  return user;
}
