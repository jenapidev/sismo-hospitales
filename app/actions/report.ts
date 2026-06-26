"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateReport } from "@/lib/report";
import { uploadProof } from "@/lib/storage";
import { applyDuplicateGroups } from "@/lib/dedup";

export interface ReportState {
  errors?: Record<string, string>;
}

function str(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

export async function reportPerson(
  _prev: ReportState,
  formData: FormData
): Promise<ReportState> {
  const proof = formData.get("proof");
  const proofFile = proof instanceof File && proof.size > 0 ? proof : null;

  const v = validateReport({
    fullName: str(formData, "fullName"),
    hospitalId: str(formData, "hospitalId"),
    status: str(formData, "status"),
    cedula: str(formData, "cedula"),
    age: str(formData, "age"),
    sex: str(formData, "sex"),
    submitterName: str(formData, "submitterName"),
    submitterContact: str(formData, "submitterContact"),
    hasProof: !!proofFile,
  });
  if (!v.ok) return { errors: v.errors };

  const admin = createAdminClient();

  let proofPath: string;
  try {
    proofPath = await uploadProof(admin, proofFile!, "reports");
  } catch {
    return { errors: { proof: "No se pudo subir la prueba. Intenta de nuevo." } };
  }

  const { data, error } = await admin
    .from("records")
    .insert({
      full_name: v.value.fullName,
      cedula: v.value.cedula,
      hospital_id: v.value.hospitalId,
      status: v.value.status,
      age: v.value.age,
      sex: v.value.sex,
      source: "public_report",
      verification_status: "unverified",
      needs_review: false,
      person_id_proof_path: proofPath,
      submitter_name: v.value.submitterName,
      submitter_contact: v.value.submitterContact,
    })
    .select("id")
    .single();

  if (error) return { errors: { _form: `No se pudo guardar: ${error.message}` } };

  await applyDuplicateGroups(admin);
  redirect(`/record/${data.id}`);
}
