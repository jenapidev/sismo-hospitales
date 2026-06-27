import L from "leaflet";

const SHADOW = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

function colorIcon(color: string): L.Icon {
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: SHADOW,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

export const markerIcon = colorIcon("blue"); // default
const haveIcon = colorIcon("green"); // has the selected category
const needIcon = colorIcon("orange"); // needs the selected category

export type MarkerState = "have" | "need" | undefined;

export function iconFor(state: MarkerState): L.Icon {
  if (state === "have") return haveIcon;
  if (state === "need") return needIcon;
  return markerIcon;
}

export const CARACAS: [number, number] = [10.49, -66.88];
