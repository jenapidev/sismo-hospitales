"use client";

import { useActionState, useState } from "react";
import dynamic from "next/dynamic";
import type { CenterState } from "@/app/actions/acopio";

const PinPicker = dynamic(() => import("./PinPicker").then((m) => m.PinPicker), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-md bg-gray-100" />,
});

export interface CenterDefaults {
  centerId?: string;
  name?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  managerName?: string;
  managerCedula?: string | null;
  orgName?: string | null;
  orgId?: string | null;
  aidDestination?: string | null;
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-sm text-red-600">{msg}</p>;
}

export function CenterForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (prev: CenterState, fd: FormData) => Promise<CenterState>;
  defaults?: CenterDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<CenterState, FormData>(action, {});
  const [lat, setLat] = useState<number | null>(defaults.lat ?? null);
  const [lng, setLng] = useState<number | null>(defaults.lng ?? null);
  const e = state.errors ?? {};
  const field = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-500";
  const label = "block text-sm font-medium text-gray-700";

  return (
    <form action={formAction} className="space-y-4">
      {defaults.centerId && <input type="hidden" name="centerId" value={defaults.centerId} />}
      {e._form && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{e._form}</p>}

      <div>
        <label className={label}>Nombre del centro *</label>
        <input name="name" defaultValue={defaults.name} className={field} />
        <Err msg={e.name} />
      </div>

      <div>
        <label className={label}>Dirección *</label>
        <input name="address" defaultValue={defaults.address} className={field} />
        <Err msg={e.address} />
      </div>

      <div>
        <label className={label}>Ubicación en el mapa * (haz clic para marcar)</label>
        <div className="mt-1">
          <PinPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
        </div>
        <input type="hidden" name="lat" value={lat ?? ""} />
        <input type="hidden" name="lng" value={lng ?? ""} />
        {lat != null && lng != null && (
          <p className="mt-1 text-xs text-gray-500">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        )}
        <Err msg={e.lat || e.lng} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Responsable *</label>
          <input name="managerName" defaultValue={defaults.managerName} className={field} />
          <Err msg={e.managerName} />
        </div>
        <div>
          <label className={label}>Cédula del responsable</label>
          <input name="managerCedula" defaultValue={defaults.managerCedula ?? ""} className={field} placeholder="V-12.345.678" />
          <Err msg={e.managerCedula} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Organización</label>
          <input name="orgName" defaultValue={defaults.orgName ?? ""} className={field} />
        </div>
        <div>
          <label className={label}>ID / RIF de la organización</label>
          <input name="orgId" defaultValue={defaults.orgId ?? ""} className={field} />
        </div>
      </div>

      <div>
        <label className={label}>Destino de la ayuda</label>
        <textarea
          name="aidDestination"
          rows={2}
          defaultValue={defaults.aidDestination ?? ""}
          className={field}
          placeholder="¿A dónde se envían los recursos recibidos?"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
