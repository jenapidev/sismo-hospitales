import Link from "next/link";
import { requireCoordinator } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminQueue, type QueueRow } from "./AdminQueue";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireCoordinator();
  const admin = createAdminClient();

  const { data: hospitals } = await admin.from("hospitals").select("id,name");
  const hospitalName: Record<string, string> = {};
  for (const h of hospitals ?? []) hospitalName[h.id] = h.name;

  const cols =
    "id,full_name,cedula,hospital_id,status,verification_status,needs_review,source,person_id_proof_path,submitter_name,submitter_contact,duplicate_group";

  const { data: queueData } = await admin
    .from("records")
    .select(cols)
    .eq("hidden", false)
    .or("needs_review.eq.true,verification_status.eq.disputed")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: dupData } = await admin
    .from("records")
    .select(cols)
    .eq("hidden", false)
    .not("duplicate_group", "is", null)
    .limit(200);

  const toRow = (r: Record<string, unknown>): QueueRow => ({
    id: r.id as string,
    fullName: r.full_name as string,
    cedula: (r.cedula as string) ?? null,
    hospitalName: hospitalName[r.hospital_id as string] ?? "—",
    status: r.status as string,
    verificationStatus: r.verification_status as string,
    needsReview: r.needs_review as boolean,
    source: r.source as string,
    proofPath: (r.person_id_proof_path as string) ?? null,
    submitterName: (r.submitter_name as string) ?? null,
    submitterContact: (r.submitter_contact as string) ?? null,
    duplicateGroup: (r.duplicate_group as string) ?? null,
  });

  const queue = (queueData ?? []).map(toRow);
  const dupes = (dupData ?? []).map(toRow);

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Panel de coordinación</h1>
        <div className="text-sm text-gray-500">
          {user.email} ·{" "}
          <Link href="/" className="hover:underline">
            sitio público
          </Link>
        </div>
      </div>

      <AdminQueue queue={queue} dupes={dupes} />
    </main>
  );
}
