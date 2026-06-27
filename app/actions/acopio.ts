"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser, canManageCenter, requireCoordinator } from "@/lib/auth";
import { validateCenter, validateItem, type CenterInput } from "@/lib/acopio";

export interface CenterState {
  errors?: Record<string, string>;
}

function s(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function readCenter(formData: FormData): CenterInput {
  return {
    name: s(formData, "name"),
    address: s(formData, "address"),
    lat: s(formData, "lat"),
    lng: s(formData, "lng"),
    managerName: s(formData, "managerName"),
    managerCedula: s(formData, "managerCedula"),
    orgName: s(formData, "orgName"),
    orgId: s(formData, "orgId"),
    aidDestination: s(formData, "aidDestination"),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadCenter(admin: any, id: string) {
  const { data } = await admin
    .from("acopio_centers")
    .select("id,owner_user_id")
    .eq("id", id)
    .maybeSingle();
  return data as { id: string; owner_user_id: string | null } | null;
}

export async function createCenter(_prev: CenterState, formData: FormData): Promise<CenterState> {
  const user = await getUser();
  if (!user) return { errors: { _form: "Inicia sesión para registrar un centro." } };

  const v = validateCenter(readCenter(formData));
  if (!v.ok) return { errors: v.errors };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("acopio_centers")
    .insert({
      name: v.value.name,
      address: v.value.address,
      lat: v.value.lat,
      lng: v.value.lng,
      aid_destination: v.value.aidDestination,
      manager_name: v.value.managerName,
      manager_cedula: v.value.managerCedula,
      org_name: v.value.orgName,
      org_id: v.value.orgId,
      owner_user_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505")
      return { errors: { name: "Ya existe un centro con ese nombre." } };
    return { errors: { _form: `No se pudo crear: ${error.message}` } };
  }
  redirect(`/acopio/${data.id}/manage`);
}

export async function updateCenter(_prev: CenterState, formData: FormData): Promise<CenterState> {
  const centerId = s(formData, "centerId");
  const user = await getUser();
  const admin = createAdminClient();
  const center = centerId ? await loadCenter(admin, centerId) : null;
  if (!center || !canManageCenter(user, center))
    return { errors: { _form: "No tienes permiso para editar este centro." } };

  const v = validateCenter(readCenter(formData));
  if (!v.ok) return { errors: v.errors };

  const { error } = await admin
    .from("acopio_centers")
    .update({
      name: v.value.name,
      address: v.value.address,
      lat: v.value.lat,
      lng: v.value.lng,
      aid_destination: v.value.aidDestination,
      manager_name: v.value.managerName,
      manager_cedula: v.value.managerCedula,
      org_name: v.value.orgName,
      org_id: v.value.orgId,
    })
    .eq("id", centerId);
  if (error) {
    if (error.code === "23505")
      return { errors: { name: "Ya existe un centro con ese nombre." } };
    return { errors: { _form: `No se pudo guardar: ${error.message}` } };
  }
  revalidatePath(`/acopio/${centerId}`);
  revalidatePath(`/acopio/${centerId}/manage`);
  return {};
}

async function requireCenterManager(centerId: string) {
  const user = await getUser();
  const admin = createAdminClient();
  const center = await loadCenter(admin, centerId);
  if (!center || !canManageCenter(user, center)) return null;
  return admin;
}

export async function addItem(formData: FormData) {
  const centerId = s(formData, "centerId");
  const admin = await requireCenterManager(centerId);
  if (!admin) return;
  const v = validateItem({
    kind: s(formData, "kind"),
    name: s(formData, "name"),
    category: s(formData, "category"),
    quantity: s(formData, "quantity"),
    unit: s(formData, "unit"),
  });
  if (!v.ok) return;
  await admin.from("acopio_items").insert({ center_id: centerId, ...v.value });
  revalidatePath(`/acopio/${centerId}/manage`);
  revalidatePath(`/acopio/${centerId}`);
}

export async function updateItem(formData: FormData) {
  const centerId = s(formData, "centerId");
  const itemId = s(formData, "itemId");
  const admin = await requireCenterManager(centerId);
  if (!admin) return;
  const v = validateItem({
    kind: s(formData, "kind"),
    name: s(formData, "name"),
    category: s(formData, "category"),
    quantity: s(formData, "quantity"),
    unit: s(formData, "unit"),
  });
  if (!v.ok) return;
  await admin
    .from("acopio_items")
    .update(v.value)
    .eq("id", itemId)
    .eq("center_id", centerId);
  revalidatePath(`/acopio/${centerId}/manage`);
  revalidatePath(`/acopio/${centerId}`);
}

export async function deleteItem(formData: FormData) {
  const centerId = s(formData, "centerId");
  const itemId = s(formData, "itemId");
  const admin = await requireCenterManager(centerId);
  if (!admin) return;
  await admin.from("acopio_items").delete().eq("id", itemId).eq("center_id", centerId);
  revalidatePath(`/acopio/${centerId}/manage`);
  revalidatePath(`/acopio/${centerId}`);
}

export async function verifyCenter(formData: FormData) {
  const user = await requireCoordinator();
  const centerId = s(formData, "centerId");
  const admin = createAdminClient();
  await admin
    .from("acopio_centers")
    .update({
      verification_status: "coordinator_verified",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", centerId);
  revalidatePath(`/acopio/${centerId}`);
  revalidatePath(`/acopio/${centerId}/manage`);
}

export async function hideCenter(formData: FormData) {
  await requireCoordinator();
  const centerId = s(formData, "centerId");
  const admin = createAdminClient();
  await admin.from("acopio_centers").update({ hidden: true }).eq("id", centerId);
  revalidatePath("/acopio");
}
