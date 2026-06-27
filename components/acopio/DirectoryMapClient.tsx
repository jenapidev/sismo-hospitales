"use client";

import dynamic from "next/dynamic";
import type { MapCenter } from "./DirectoryMap";

const DirectoryMap = dynamic(() => import("./DirectoryMap").then((m) => m.DirectoryMap), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-md bg-gray-100" />,
});

export function DirectoryMapClient({ centers }: { centers: MapCenter[] }) {
  return <DirectoryMap centers={centers} />;
}
