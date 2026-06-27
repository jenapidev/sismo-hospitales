"use client";

import dynamic from "next/dynamic";

const CenterMap = dynamic(() => import("./CenterMap").then((m) => m.CenterMap), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-md bg-gray-100" />,
});

export function CenterMapClient(props: { lat: number; lng: number; name: string }) {
  return <CenterMap {...props} />;
}
