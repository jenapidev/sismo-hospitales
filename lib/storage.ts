/* eslint-disable @typescript-eslint/no-explicit-any */
export const PROOFS_BUCKET = "proofs";

/**
 * Upload an ID-proof file to the private proofs bucket. Returns the storage path.
 * `admin` is a service-role client. Files are never publicly readable; coordinators
 * view them via short-lived signed URLs.
 */
export async function uploadProof(
  admin: any,
  file: File,
  folder: "reports" | "verifications"
): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${globalThis.crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage.from(PROOFS_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`upload proof failed: ${error.message}`);
  return path;
}
