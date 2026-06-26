import Link from "next/link";
import type { PublicRecord } from "@/lib/types";
import { STATUS_LABELS, VERIFICATION_LABELS, VERIFICATION_BADGE } from "@/lib/labels";

export function RecordCard({ record }: { record: PublicRecord }) {
  return (
    <Link
      href={`/record/${record.id}`}
      className="block rounded-lg border border-gray-200 p-4 transition hover:border-gray-400 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-900">{record.fullName}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            VERIFICATION_BADGE[record.verificationStatus]
          }`}
        >
          {VERIFICATION_LABELS[record.verificationStatus]}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
        <div>
          <dt className="inline text-gray-400">Hospital: </dt>
          <dd className="inline">{record.hospitalName}</dd>
        </div>
        <div>
          <dt className="inline text-gray-400">Estado: </dt>
          <dd className="inline">{STATUS_LABELS[record.status]}</dd>
        </div>
        {record.cedula && (
          <div>
            <dt className="inline text-gray-400">Cédula: </dt>
            <dd className="inline">{record.cedula}</dd>
          </div>
        )}
        {record.age != null && (
          <div>
            <dt className="inline text-gray-400">Edad: </dt>
            <dd className="inline">{record.age}</dd>
          </div>
        )}
      </dl>
    </Link>
  );
}
