"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { iconFor, CARACAS, type MarkerState } from "./icon";

export interface MapCenter {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  markerState?: MarkerState;
}

/** Re-fit the map to the current set of pins whenever they change. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join(";");
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [30, 30], maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

export function DirectoryMap({ centers }: { centers: MapCenter[] }) {
  const pinned = centers.filter((c) => c.lat != null && c.lng != null);
  const points = pinned.map((c) => [c.lat!, c.lng!] as [number, number]);
  return (
    <div className="h-72 overflow-hidden rounded-md border border-gray-200">
      <MapContainer center={CARACAS} zoom={11} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {pinned.map((c) => (
          <Marker key={c.id} position={[c.lat!, c.lng!]} icon={iconFor(c.markerState)}>
            <Popup>
              <Link href={`/acopio/${c.id}`} className="text-blue-700 underline">
                {c.name}
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
