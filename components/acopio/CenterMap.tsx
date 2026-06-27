"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { markerIcon } from "./icon";

export function CenterMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  return (
    <div className="h-64 overflow-hidden rounded-md border border-gray-200">
      <MapContainer center={[lat, lng]} zoom={15} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={markerIcon}>
          <Popup>{name}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
