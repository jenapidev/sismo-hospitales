"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { markerIcon, CARACAS } from "./icon";

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function PinPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const hasPin = lat != null && lng != null;
  return (
    <div className="h-64 overflow-hidden rounded-md border border-gray-300">
      <MapContainer center={hasPin ? [lat!, lng!] : CARACAS} zoom={12} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {hasPin && <Marker position={[lat!, lng!]} icon={markerIcon} />}
      </MapContainer>
    </div>
  );
}
