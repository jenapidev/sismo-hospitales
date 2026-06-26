"use server";

import { revalidatePath } from "next/cache";
import { requireCoordinator } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROOFS_BUCKET } from "@/lib/storage";

function id(formData: FormData): string {
  return String(formData.get("recordId") ?? "");
}

export async function setVerified(formData: FormData) {
  await requireCoordinator();
  const admin = createAdminClient();
  await admin
    .from("records")
    .update({
      verification_status: "coordinator_verified",
      verified_at: new Date().toISOString(),
      needs_review: false,
    })
    .eq("id", id(formData));
  revalidatePath("/admin");
}

export async function setDisputed(formData: FormData) {
  await requireCoordinator();
  const admin = createAdminClient();
  await admin
    .from("records")
    .update({ verification_status: "disputed" })
    .eq("id", id(formData));
  revalidatePath("/admin");
}

export async function clearReview(formData: FormData) {
  await requireCoordinator();
  const admin = createAdminClient();
  await admin.from("records").update({ needs_review: false }).eq("id", id(formData));
  revalidatePath("/admin");
}

export async function hideRecord(formData: FormData) {
  await requireCoordinator();
  const admin = createAdminClient();
  await admin.from("records").update({ hidden: true }).eq("id", id(formData));
  revalidatePath("/admin");
}

/** Merge a duplicate group: keep one record, hide the rest in the group. */
export async function mergeDuplicates(formData: FormData) {
  await requireCoordinator();
  const groupId = String(formData.get("groupId") ?? "");
  const keepId = String(formData.get("keepId") ?? "");
  if (!groupId || !keepId) return;
  const admin = createAdminClient();
  await admin
    .from("records")
    .update({ hidden: true })
    .eq("duplicate_group", groupId)
    .neq("id", keepId);
  await admin.from("records").update({ duplicate_group: null }).eq("id", keepId);
  revalidatePath("/admin");
}

/** Coordinator-only: mint a short-lived signed URL for an ID-proof file. */
export async function getSignedProofUrl(path: string): Promise<string | null> {
  await requireCoordinator();
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from(PROOFS_BUCKET).createSignedUrl(path, 120);
  return data?.signedUrl ?? null;
}
