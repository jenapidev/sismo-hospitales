import Link from "next/link";
import { notFound } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUS_LABELS, VERIFICATION_LABELS, VERIFICATION_BADGE } from "@/lib/labels";
import { VerifyForm } from "./VerifyForm";

export const dynamic = "force-dynamic";

export default async function RecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAnonClient();

  const { data: record } = await supabase
    .from("records_public")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!record) notFound();

  const { data: hospital } = await supabase
    .from("hospitals")
    .select("name")
    .eq("id", record.hospital_id)
    .maybeSingle();

  // Aggregate verification counts (identities stay private).
  const admin = createAdminClient();
  const [{ count: confirms }, { count: disputes }] = await Promise.all([
    admin.from("verifications").select("*", { count: "exact", head: true }).eq("record_id", id).eq("claim", "confirm"),
    admin.from("verifications").select("*", { count: "exact", head: true }).eq("record_id", id).eq("claim", "dispute"),
  ]);

  // Other hospitals where this person may also be reported.
  let dupes: { id: string; hospital_id: string }[] = [];
  if (record.duplicate_group) {
    const { data } = await supabase
      .from("records_public")
      .select("id,hospital_id")
      .eq("duplicate_group", record.duplicate_group)
      .neq("id", id);
    dupes = data ?? [];
  }

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <Link href="/" className="text-sm text-gray-500 hover:underline">
        ← Volver a la búsqueda
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{record.full_name}</h1>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            VERIFICATION_BADGE[record.verification_status as keyof typeof VERIFICATION_BADGE]
          }`}
        >
          {VERIFICATION_LABELS[record.verification_status as keyof typeof VERIFICATION_LABELS]}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Field label="Hospital" value={hospital?.name ?? "No identificado"} />
        <Field label="Estado" value={STATUS_LABELS[record.status as keyof typeof STATUS_LABELS]} />
        {record.cedula && <Field label="Cédula" value={record.cedula} />}
        {record.age != null && <Field label="Edad" value={String(record.age)} />}
        {record.sex && <Field label="Sexo" value={record.sex} />}
        {record.notes && <Field label="Notas" value={record.notes} />}
      </dl>

      <p className="mt-4 text-sm text-gray-600">
        Confirmaciones de la comunidad: <strong>{confirms ?? 0}</strong> · Disputas:{" "}
        <strong>{disputes ?? 0}</strong>
      </p>

      {dupes.length > 0 && (
        <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          ⚠️ Esta persona aparece reportada en {dupes.length} hospital(es) más.{" "}
          {dupes.map((d, i) => (
            <span key={d.id}>
              <Link href={`/record/${d.id}`} className="underline">
                ver registro {i + 1}
              </Link>
              {i < dupes.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}

      <section className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900">Verificar este registro</h2>
        <p className="mt-1 mb-4 text-sm text-gray-600">
          ¿Conoces a esta persona? Ayuda a la comunidad confirmando o corrigiendo la
          información.
        </p>
        <VerifyForm recordId={id} />
      </section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
