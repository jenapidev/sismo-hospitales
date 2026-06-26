/**
 * Ensure the private `proofs` storage bucket exists. Idempotent.
 * Usage: npx tsx scripts/setup-storage.ts
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw new Error(`listBuckets: ${error.message}`);

  if (buckets?.some((b) => b.name === "proofs")) {
    console.log("Bucket 'proofs' already exists.");
    return;
  }

  const { error: createErr } = await admin.storage.createBucket("proofs", {
    public: false,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  });
  if (createErr) throw new Error(`createBucket: ${createErr.message}`);
  console.log("Created private bucket 'proofs'.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
