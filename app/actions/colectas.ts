"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser, canManageColecta } from "@/lib/auth";
import { validateColecta, validateAccount, validateDonacion } from "@/lib/colectas";
import { uploadProof, PROOFS_BUCKET } from "@/lib/storage";

export interface ColectaState {
  errors?: Record<string, string>;
}
export interface DonacionState {
  errors?: Record<string, string>;
  ok?: boolean;
}

function s(fd: FormData, name: string): string {
  return String(fd.get(name) ?? "");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadColecta(admin: any, id: string) {
  const { data } = await admin
    .from("colectas")
    .select("id,owner_user_id")
    .eq("id", id)
    .maybeSingle();
  return data as { id: string; owner_user_id: string | null } | null;
}

async function requireColectaManager(colectaId: string) {
  const user = await getUser();
  const admin = createAdminClient();
  const colecta = colectaId ? await loadColecta(admin, colectaId) : null;
  if (!colecta || !canManageColecta(user, colecta)) return null;
  return admin;
}

function readColecta(fd: FormData) {
  return {
    title: s(fd, "title"),
    description: s(fd, "description"),
    goalAmount: s(fd, "goalAmount"),
    currency: s(fd, "currency"),
    adminName: s(fd, "adminName"),
    adminCedula: s(fd, "adminCedula"),
    adminEmail: s(fd, "adminEmail"),
  };
}

export async function createColecta(_prev: ColectaState, fd: FormData): Promise<ColectaState> {
  const user = await getUser();
  if (!user) return { errors: { _form: "Inicia sesión para crear una colecta." } };
  const v = validateColecta(readColecta(fd));
  if (!v.ok) return { errors: v.errors };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("colectas")
    .insert({
      title: v.value.title,
      description: v.value.description,
      goal_amount: v.value.goalAmount,
      currency: v.value.currency,
      admin_name: v.value.adminName,
      admin_cedula: v.value.adminCedula,
      admin_email: v.value.adminEmail,
      owner_user_id: user.id,
    })
    .select("id")
    .single();
  if (error) return { errors: { _form: `No se pudo crear: ${error.message}` } };
  redirect(`/colectas/${data.id}/gestionar`);
}

export async function updateColecta(_prev: ColectaState, fd: FormData): Promise<ColectaState> {
  const colectaId = s(fd, "colectaId");
  const admin = await requireColectaManager(colectaId);
  if (!admin) return { errors: { _form: "No tienes permiso para editar esta colecta." } };
  const v = validateColecta(readColecta(fd));
  if (!v.ok) return { errors: v.errors };
  const { error } = await admin
    .from("colectas")
    .update({
      title: v.value.title,
      description: v.value.description,
      goal_amount: v.value.goalAmount,
      currency: v.value.currency,
      admin_name: v.value.adminName,
      admin_cedula: v.value.adminCedula,
      admin_email: v.value.adminEmail,
    })
    .eq("id", colectaId);
  if (error) return { errors: { _form: `No se pudo guardar: ${error.message}` } };
  revalidatePath(`/colectas/${colectaId}`);
  revalidatePath(`/colectas/${colectaId}/gestionar`);
  return {};
}

export async function deleteColecta(fd: FormData) {
  const colectaId = s(fd, "colectaId");
  const admin = await requireColectaManager(colectaId);
  if (!admin) return;
  await admin.from("colectas").delete().eq("id", colectaId);
  redirect("/colectas");
}

export async function addAccount(fd: FormData) {
  const colectaId = s(fd, "colectaId");
  const admin = await requireColectaManager(colectaId);
  if (!admin) return;
  const v = validateAccount({
    method: s(fd, "method"),
    phone: s(fd, "phone"),
    bankEntity: s(fd, "bankEntity"),
    cedula: s(fd, "cedula"),
    email: s(fd, "email"),
    ownerName: s(fd, "ownerName"),
  });
  if (!v.ok) return;
  await admin.from("colecta_accounts").insert({
    colecta_id: colectaId,
    method: v.value.method,
    phone: v.value.phone,
    bank_entity: v.value.bankEntity,
    cedula: v.value.cedula,
    email: v.value.email,
    owner_name: v.value.ownerName,
  });
  revalidatePath(`/colectas/${colectaId}/gestionar`);
  revalidatePath(`/colectas/${colectaId}`);
}

export async function deleteAccount(fd: FormData) {
  const colectaId = s(fd, "colectaId");
  const accountId = s(fd, "accountId");
  const admin = await requireColectaManager(colectaId);
  if (!admin) return;
  await admin.from("colecta_accounts").delete().eq("id", accountId).eq("colecta_id", colectaId);
  revalidatePath(`/colectas/${colectaId}/gestionar`);
  revalidatePath(`/colectas/${colectaId}`);
}

export async function submitDonacion(_prev: DonacionState, fd: FormData): Promise<DonacionState> {
  const colectaId = s(fd, "colectaId");
  if (!colectaId) return { errors: { _form: "Colecta inválida." } };

  const proof = fd.get("proof");
  const proofFile = proof instanceof File && proof.size > 0 ? proof : null;

  const v = validateDonacion({
    amount: s(fd, "amount"),
    currency: s(fd, "currency"),
    donorName: s(fd, "donorName"),
    accountId: s(fd, "accountId"),
    hasProof: !!proofFile,
  });
  if (!v.ok) return { errors: v.errors };

  const admin = createAdminClient();
  let proofPath: string;
  try {
    proofPath = await uploadProof(admin, proofFile!, "donations");
  } catch {
    return { errors: { proof: "No se pudo subir el comprobante. Intenta de nuevo." } };
  }

  const { error } = await admin.from("donaciones").insert({
    colecta_id: colectaId,
    account_id: v.value.accountId,
    amount: v.value.amount,
    currency: v.value.currency,
    donor_name: v.value.donorName,
    proof_path: proofPath,
    status: "pending",
  });
  if (error) return { errors: { _form: `No se pudo registrar: ${error.message}` } };

  revalidatePath(`/colectas/${colectaId}`);
  revalidatePath(`/colectas/${colectaId}/gestionar`);
  return { ok: true };
}

async function setDonacionStatus(fd: FormData, status: "confirmed" | "rejected") {
  const donacionId = s(fd, "donacionId");
  const admin = createAdminClient();
  const { data: don } = await admin
    .from("donaciones")
    .select("id,colecta_id")
    .eq("id", donacionId)
    .maybeSingle();
  if (!don) return;
  const manager = await requireColectaManager(don.colecta_id);
  if (!manager) return;
  await admin.from("donaciones").update({ status }).eq("id", donacionId);
  revalidatePath(`/colectas/${don.colecta_id}`);
  revalidatePath(`/colectas/${don.colecta_id}/gestionar`);
}

export async function confirmDonacion(fd: FormData) {
  await setDonacionStatus(fd, "confirmed");
}
export async function rejectDonacion(fd: FormData) {
  await setDonacionStatus(fd, "rejected");
}

export async function deleteDonacion(fd: FormData) {
  const donacionId = s(fd, "donacionId");
  const admin = createAdminClient();
  const { data: don } = await admin
    .from("donaciones")
    .select("id,colecta_id")
    .eq("id", donacionId)
    .maybeSingle();
  if (!don) return;
  const manager = await requireColectaManager(don.colecta_id);
  if (!manager) return;
  await admin.from("donaciones").delete().eq("id", donacionId);
  revalidatePath(`/colectas/${don.colecta_id}/gestionar`);
  revalidatePath(`/colectas/${don.colecta_id}`);
}

/** Owner/coordinator-only: signed URL for a donation's proof image. */
export async function getDonacionProofUrl(donacionId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: don } = await admin
    .from("donaciones")
    .select("colecta_id,proof_path")
    .eq("id", donacionId)
    .maybeSingle();
  if (!don) return null;
  const manager = await requireColectaManager(don.colecta_id);
  if (!manager) return null;
  const { data } = await admin.storage.from(PROOFS_BUCKET).createSignedUrl(don.proof_path, 120);
  return data?.signedUrl ?? null;
}
