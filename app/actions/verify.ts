"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadProof } from "@/lib/storage";
import { nextStatusAfterVerification, validateVerification } from "@/lib/verify";

export interface VerifyState {
  errors?: Record<string, string>;
  ok?: boolean;
}

function str(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

export async function submitVerification(
  _prev: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const recordId = str(formData, "recordId");
  if (!recordId) return { errors: { _form: "Registro inválido." } };

  const proof = formData.get("proof");
  const proofFile = proof instanceof File && proof.size > 0 ? proof : null;

  const v = validateVerification({
    claim: str(formData, "claim"),
    verifierName: str(formData, "verifierName"),
    verifierContact: str(formData, "verifierContact"),
    note: str(formData, "note"),
    hasProof: !!proofFile,
  });
  if (!v.ok) return { errors: v.errors };

  const admin = createAdminClient();

  let proofPath: string;
  try {
    proofPath = await uploadProof(admin, proofFile!, "verifications");
  } catch {
    return { errors: { proof: "No se pudo subir la prueba. Intenta de nuevo." } };
  }

  const { error: insErr } = await admin.from("verifications").insert({
    record_id: recordId,
    claim: v.value.claim,
    verifier_name: v.value.verifierName,
    verifier_contact: v.value.verifierContact,
    verifier_id_proof_path: proofPath,
    note: v.value.note,
  });
  if (insErr) return { errors: { _form: `No se pudo guardar: ${insErr.message}` } };

  // Recompute status from the up-to-date counts.
  const [{ count: confirms }, { count: disputes }, { data: rec }] = await Promise.all([
    admin
      .from("verifications")
      .select("*", { count: "exact", head: true })
      .eq("record_id", recordId)
      .eq("claim", "confirm"),
    admin
      .from("verifications")
      .select("*", { count: "exact", head: true })
      .eq("record_id", recordId)
      .eq("claim", "dispute"),
    admin.from("records").select("verification_status").eq("id", recordId).single(),
  ]);

  if (rec) {
    const next = nextStatusAfterVerification(
      rec.verification_status,
      confirms ?? 0,
      disputes ?? 0
    );
    if (next !== rec.verification_status) {
      await admin.from("records").update({ verification_status: next }).eq("id", recordId);
    }
  }

  revalidatePath(`/record/${recordId}`);
  return { ok: true };
}
