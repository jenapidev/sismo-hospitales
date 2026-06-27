"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { markerIcon, CARACAS } from "./icon";

export interface MapCenter {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

export function DirectoryMap({ centers }: { centers: MapCenter[] }) {
  const pinned = centers.filter((c) => c.lat != null && c.lng != null);
  return (
    <div className="h-72 overflow-hidden rounded-md border border-gray-200">
      <MapContainer center={CARACAS} zoom={11} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((c) => (
          <Marker key={c.id} position={[c.lat!, c.lng!]} icon={markerIcon}>
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
